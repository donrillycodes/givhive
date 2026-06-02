import cron from 'node-cron';
import db from '../config/database';
import { writeSystemAuditLog } from '../middleware/audit';
import { AuditAction, AuditEntityType } from '@prisma/client';
import logger from '../utils/logger';
import notificationService from '../services/notification.service';
import invitationService from '../services/invitation.service';

// /**
//  * FoodShare Cron Jobs
//  *
//  * These jobs run automatically on a schedule.
//  * They are started when the server starts in server.ts.
//  *
//  * Schedule syntax: '* * * * *'
//  *   - Minute   (0-59)
//  *   - Hour     (0-23)
//  *   - Day      (1-31)
//  *   - Month    (1-12)
//  *   - Weekday  (0-7, 0 and 7 are Sunday)
//  *
//  * Examples:
//  *   '0 0 * * *'   — every day at midnight
//  *   '0 * * * *'   — every hour
//  *   '*/30 * * * *' — every 30 minutes
//  */

// ── Cron Job 1 — Pledge Expiry ─────────────────────────────────────────────────
// Runs every day at 1:00 AM
// Expires pledges where dropOffDate has passed with no action
const expirePledges = async (): Promise<void> => {
  logger.info('Cron: Starting pledge expiry job');

  try {
    const now = new Date();

    // Find all pledges that should be expired
    const expiredPledges = await db.foodPledge.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        dropOffDate: { lt: now },
      },
      select: {
        id: true,
        quantityPledged: true,
        foodNeedId: true,
        donorId: true,
      },
    });

    if (expiredPledges.length === 0) {
      logger.info('Cron: No pledges to expire');
      return;
    }

    logger.info(`Cron: Found ${expiredPledges.length} pledges to expire`);

    // Process each expired pledge
    for (const pledge of expiredPledges) {
      try {
        // Expire the pledge and decrement the food need counter
        // Both in a single transaction
        await db.$transaction([
          db.foodPledge.update({
            where: { id: pledge.id },
            data: {
              status: 'EXPIRED',
              cancelledAt: now,
              cancellationReason:
                'Automatically expired — drop off date passed',
            },
          }),
          db.foodNeed.update({
            where: { id: pledge.foodNeedId },
            data: {
              quantityFulfilled: { decrement: pledge.quantityPledged },
              // Re-open the food need if it was marked fulfilled
              status: 'OPEN',
            },
          }),
        ]);

        // Write audit log for each expired pledge
        await writeSystemAuditLog({
          action: AuditAction.PLEDGE_CANCELLED,
          entityType: AuditEntityType.FOOD_PLEDGE,
          entityId: pledge.id,
          previousState: { status: 'PENDING' },
          newState: { status: 'EXPIRED' },
          notes: 'Automatically expired by cron job — drop off date passed',
        });

        // Send notification to donor
        await notificationService.sendNotification({
          userId: pledge.donorId,
          title: 'Food pledge expired',
          body: 'Your food pledge has expired because the drop off date passed. You can make a new pledge anytime.',
          type: 'PLEDGE_CANCELLED',
          referenceId: pledge.id,
          referenceType: 'FOOD_PLEDGE',
        });

        logger.info(`Cron: Pledge expired: ${pledge.id}`);
      } catch (error) {
        // Log individual pledge errors but continue processing others
        logger.error(`Cron: Failed to expire pledge: ${pledge.id}`, {
          error,
        });
      }
    }

    logger.info(
      `Cron: Pledge expiry complete — expired ${expiredPledges.length} pledges`
    );
  } catch (error) {
    logger.error('Cron: Pledge expiry job failed', { error });
  }
};

// ── Cron Job 2 — Notification Cleanup ─────────────────────────────────────────
// Runs every day at 2:00 AM
// Archives old unread notifications and deletes old read/archived ones
const cleanupNotifications = async (): Promise<void> => {
  logger.info('Cron: Starting notification cleanup job');

  try {
    const result = await notificationService.cleanupExpiredNotifications();

    logger.info(
      `Cron: Notification cleanup complete — archived ${result.archived}, deleted ${result.deleted}`
    );
  } catch (error) {
    logger.error('Cron: Notification cleanup job failed', { error });
  }
};

// ── Cron Job 3 — Food Need Expiry ─────────────────────────────────────────────
// Runs every day at 3:00 AM
// Marks food needs as EXPIRED when their deadline has passed
const expireFoodNeeds = async (): Promise<void> => {
  logger.info('Cron: Starting food need expiry job');

  try {
    const now = new Date();

    const result = await db.foodNeed.updateMany({
      where: {
        status: 'OPEN',
        deadline: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      await writeSystemAuditLog({
        action: AuditAction.FOOD_NEED_CLOSED,
        entityType: AuditEntityType.FOOD_NEED,
        entityId: 'bulk',
        newState: { status: 'EXPIRED', count: result.count },
        notes: `Bulk expiry — ${result.count} food needs expired by cron job`,
      });
    }

    logger.info(
      `Cron: Food need expiry complete — expired ${result.count} food needs`
    );
  } catch (error) {
    logger.error('Cron: Food need expiry job failed', { error });
  }
};

// ── Cron Job 4 — Invitation Expiry ────────────────────────────────────────────
// Runs every day at 4:00 AM
// Marks PENDING invitations past their expiresAt as EXPIRED
const expireInvitations = async (): Promise<void> => {
  logger.info('Cron: Starting invitation expiry job');
  try {
    const count = await invitationService.expirePending();
    logger.info(`Cron: Invitation expiry complete — expired ${count} invitations`);
  } catch (error) {
    logger.error('Cron: Invitation expiry job failed', { error });
  }
};

// ── Start all cron jobs ────────────────────────────────────────────────────────
export const startCronJobs = (): void => {
  // Pledge expiry — every day at 1:00 AM
  cron.schedule('0 1 * * *', expirePledges, {
    timezone: 'America/Winnipeg',
  });

  // Notification cleanup — every day at 2:00 AM
  cron.schedule('0 2 * * *', cleanupNotifications, {
    timezone: 'America/Winnipeg',
  });

  // Food need expiry — every day at 3:00 AM
  cron.schedule('0 3 * * *', expireFoodNeeds, {
    timezone: 'America/Winnipeg',
  });

  // Invitation expiry — every day at 4:00 AM
  cron.schedule('0 4 * * *', expireInvitations, {
    timezone: 'America/Winnipeg',
  });

  logger.info('Cron: All jobs scheduled — running on Winnipeg time');
};
