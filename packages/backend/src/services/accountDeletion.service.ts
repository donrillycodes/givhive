import { AccountDeletion, Prisma } from '@prisma/client';
import admin from '../config/firebase';
import db from '../config/database';
import { AppError } from '../middleware/error';
import { assertRecentAuthentication } from '../utils/recentAuthentication';
import emailService from './email.service';
import logger from '../utils/logger';

export class AccountDeletionService {
  private processingQueue = false;

  async deleteAccount(userId: string, firebaseUid: string, authTime?: number) {
    assertRecentAuthentication(authTime);
    let job: AccountDeletion | undefined;
    // Retrying this transaction is safe: Firebase and mail are only contacted
    // after it commits. Serializable conflicts must not leave partial erasure.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        job = await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
          const user = await tx.user.findUnique({
            where: { id: userId },
            include: {
              managedNgo: { select: { id: true } },
              _count: { select: {
                postedNeeds: true, postedUpdates: true, ngoReviews: true,
                sentInvitesNgo: true, sentInvitesAdmin: true, sentInvitations: true,
              } },
            },
          });
          if (!user || user.firebaseUid !== firebaseUid) throw new AppError('Account not found', 404);
          // Only donors use the mobile app. Organisation/admin identities must
          // first transfer organisational responsibilities in a separate flow.
          if (user.role !== 'DONOR' || user.managedNgo || Object.values(user._count).some(count => count > 0)) {
            throw new AppError('This account has organisation or administrator responsibilities. Transfer those responsibilities before deleting it.', 409);
          }

          await tx.$queryRaw`SELECT id FROM food_pledges WHERE "donorId" = ${userId} FOR UPDATE`;
          const pledges = await tx.foodPledge.findMany({
            where: { donorId: userId },
            select: { id: true, foodNeedId: true, quantityPledged: true, status: true },
          });
          const now = new Date();
          for (const pledge of pledges) {
            if (!['PENDING', 'CONFIRMED'].includes(pledge.status)) continue;
            // Active pledges reserve quantities. Release those reservations;
            // fulfilled food stays counted, and closed/expired needs stay closed.
            await tx.$executeRaw`
              UPDATE food_needs
              SET "quantityFulfilled" = GREATEST(0, "quantityFulfilled" - ${pledge.quantityPledged}),
                  status = CASE WHEN status = 'FULFILLED' THEN
                    CASE WHEN deadline IS NOT NULL AND deadline <= ${now}
                      THEN 'EXPIRED'::"FoodNeedStatus" ELSE 'OPEN'::"FoodNeedStatus" END
                    ELSE status END,
                  "updatedAt" = ${now}
              WHERE id = ${pledge.foodNeedId}`;
          }

          const donations = await tx.donation.findMany({ where: { donorId: userId }, select: { id: true } });
          await tx.donation.updateMany({
            where: { donorId: userId },
            data: { donorId: null, message: null, refundReason: null, isAnonymous: true },
          });
          const pledgeIds = pledges.map(pledge => pledge.id);
          await tx.notification.deleteMany({ where: { OR: [
            { userId }, { referenceType: 'FOOD_PLEDGE', referenceId: { in: pledgeIds } },
            { referenceType: 'DONATION', referenceId: { in: donations.map(donation => donation.id) } },
          ] } });
          await tx.donorPreference.deleteMany({ where: { userId } });
          await tx.foodPledge.deleteMany({ where: { donorId: userId } });
          await tx.nGOMember.deleteMany({ where: { userId } });
          await tx.adminMember.deleteMany({ where: { userId } });
          await tx.invitation.deleteMany({ where: { email: { equals: user.email, mode: 'insensitive' } } });
          await tx.auditLog.deleteMany({ where: { OR: [
            { actorId: userId }, { entityType: 'USER', entityId: userId },
            { entityType: 'FOOD_PLEDGE', entityId: { in: pledgeIds } },
            { entityType: 'DONATION', entityId: { in: donations.map(donation => donation.id) } },
          ] } });

          const deletion = await tx.accountDeletion.create({ data: { firebaseUid, email: user.email } });
          await tx.user.delete({ where: { id: userId } });
          await tx.auditLog.create({ data: {
            action: 'USER_DELETED', actorRole: 'SYSTEM', entityType: 'USER',
            // An unrelated request ID, not an identifier linking back to a profile.
            entityId: deletion.id, notes: 'Donor account and personal data removed',
          } });
          return deletion;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
        throw error;
      }
    }
    if (!job) throw new AppError('Could not delete the account. Please try again.', 503);
    // A 200 response itself confirms immediate completion. Delayed cleanup is
    // durable and sends confirmation by email when the worker finishes it.
    const completed = await this.finishDeletion(job, false);
    return { status: completed ? 'completed' as const : 'pending' as const };
  }

  private async finishDeletion(job: AccountDeletion, notify: boolean): Promise<boolean> {
    try {
      if (job.firebaseUid) {
        try {
          await admin.auth().deleteUser(job.firebaseUid);
        } catch (error) {
          if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
        }
        await db.accountDeletion.updateMany({ where: { id: job.id }, data: { firebaseUid: null } });
      }
      if (notify) {
        const sent = await emailService.sendAccountDeletionConfirmation(job.email, job.id);
        // Bound retention of the delivery address if the mail provider is down.
        const emailExpired = Date.now() - job.requestedAt.getTime() > 7 * 24 * 60 * 60 * 1000;
        if (!sent && !emailExpired) return false;
      }
      await db.accountDeletion.deleteMany({ where: { id: job.id } });
      return true;
    } catch {
      // Never put email addresses, Firebase IDs or provider errors into logs.
      logger.error('Account deletion cleanup will be retried', { deletionId: job.id });
      return false;
    }
  }

  async processPendingDeletions(): Promise<void> {
    if (this.processingQueue) return;
    this.processingQueue = true;
    try {
      const jobs = await db.accountDeletion.findMany({
        // Failed email deliveries must not starve newer Firebase cleanup jobs.
        orderBy: [{ lastAttemptAt: { sort: 'asc', nulls: 'first' } }, { requestedAt: 'asc' }], take: 50,
      });
      for (const job of jobs) {
        await db.accountDeletion.updateMany({ where: { id: job.id }, data: { attempts: { increment: 1 }, lastAttemptAt: new Date() } });
        if (job.firebaseUid && Date.now() - job.requestedAt.getTime() > 24 * 60 * 60 * 1000) {
          logger.error('Account deletion cleanup has been pending for more than a day', { deletionId: job.id });
        }
        await this.finishDeletion(job, true);
      }
    } catch {
      logger.error('Could not process account deletion cleanup queue');
    } finally {
      this.processingQueue = false;
    }
  }
}

export default new AccountDeletionService();
