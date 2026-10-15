import db from '../config/database';
import { AppError } from '../middleware/error';
import { Prisma } from '@prisma/client';

export const REPORT_REASONS = ['HARASSMENT', 'HATE_OR_SEXUAL_CONTENT', 'FRAUD_OR_SPAM', 'UNSAFE_FOOD', 'PRIVACY', 'OTHER'] as const;
export type ReportTarget = 'NGO' | 'UPDATE' | 'FOOD_NEED';
export function validateReport(input: Record<string, unknown>) {
  const { targetType, targetId, reason, details } = input;
  if (!['NGO', 'UPDATE', 'FOOD_NEED'].includes(String(targetType)) ||
      typeof targetId !== 'string' || !/^[a-f\d-]{36}$/i.test(targetId) ||
      !REPORT_REASONS.includes(reason as typeof REPORT_REASONS[number]) ||
      typeof details !== 'string' || details.trim().length < 5 || details.trim().length > 1000) {
    throw new AppError('Choose a report reason and enter 5–1000 characters describing the concern.', 400);
  }
  return { targetType: targetType as ReportTarget, targetId, reason: String(reason), details: details.trim() };
}

// These filters are applied before pagination and also on direct detail requests.
export const visibleOrganisation = (userId?: string): Prisma.NGOWhereInput => userId
  ? { blockedBy: { none: { userId } } } : {};

export class SafetyService {
  async report(userId: string, input: Record<string, unknown>) {
    const data = validateReport(input);
    let ngoId: string;
    let snapshot: Prisma.InputJsonValue;
    if (data.targetType === 'NGO') {
      const ngo = await db.nGO.findFirst({ where: { id: data.targetId, status: 'APPROVED', isActive: true },
        select: { id: true, name: true, description: true, mission: true, logoUrl: true, coverUrl: true } });
      if (!ngo) throw new AppError('Organisation not found', 404);
      ngoId = ngo.id; snapshot = ngo;
    } else if (data.targetType === 'UPDATE') {
      const update = await db.update.findFirst({ where: { id: data.targetId, status: 'PUBLISHED', isFlagged: false, moderationStatus: 'APPROVED',
        ngo: { status: 'APPROVED', isActive: true } },
        select: { id: true, ngoId: true, title: true, body: true, coverImageUrl: true, postedById: true } });
      if (!update) throw new AppError('Update not found', 404);
      ngoId = update.ngoId; snapshot = update;
    } else {
      const need = await db.foodNeed.findFirst({ where: { id: data.targetId, isSafetyHidden: false, moderationStatus: 'APPROVED', ngo: { status: 'APPROVED', isActive: true } },
        select: { id: true, ngoId: true, title: true, description: true, itemName: true, dropOffInstructions: true, imageUrl: true, postedById: true } });
      if (!need) throw new AppError('Food need not found', 404);
      ngoId = need.ngoId; snapshot = need;
    }
    // One report per donor and target, including concurrent/retried submissions.
    await db.safetyReport.createMany({ data: [{ ...data, reporterId: userId, ngoId, snapshot }], skipDuplicates: true });
    return db.safetyReport.findUniqueOrThrow({
      where: { reporterId_targetType_targetId: { reporterId: userId, targetType: data.targetType, targetId: data.targetId } }, select: { id: true },
    });
  }

  async block(userId: string, ngoId: string) {
    const ngo = await db.nGO.findFirst({ where: { id: ngoId, status: 'APPROVED', isActive: true }, select: { id: true } });
    if (!ngo) throw new AppError('Organisation not found', 404);
    await db.blockedOrganisation.createMany({ data: [{ userId, ngoId }], skipDuplicates: true });
    return db.blockedOrganisation.findUniqueOrThrow({ where: { userId_ngoId: { userId, ngoId } }, select: { id: true } });
  }

  async blocks(userId: string) {
    return db.blockedOrganisation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' },
      select: { ngoId: true, createdAt: true, ngo: { select: { name: true } } } });
  }

  async unblock(userId: string, ngoId: string) {
    await db.blockedOrganisation.deleteMany({ where: { userId, ngoId } });
  }

  async pending() {
    const ngo = { status: 'APPROVED' as const, isActive: true };
    const [updates, needs] = await Promise.all([
      db.update.findMany({ where: { moderationStatus: 'PENDING', status: 'PUBLISHED', isFlagged: false, ngo },
        orderBy: { updatedAt: 'asc' }, take: 25, select: { id: true, title: true, body: true, summary: true, type: true, coverImageUrl: true, updatedAt: true, ngo: { select: { name: true } } } }),
      db.foodNeed.findMany({ where: { moderationStatus: 'PENDING', status: 'OPEN', isSafetyHidden: false, ngo },
        orderBy: { updatedAt: 'asc' }, take: 25, select: { id: true, title: true, description: true, itemName: true, itemCategory: true, unit: true, quantityRequired: true, isUrgent: true, deadline: true, dropOffAddress: true, dropOffInstructions: true, imageUrl: true, updatedAt: true, ngo: { select: { name: true } } } }),
    ]);
    return [...updates.map(item => ({ ...item, targetType: 'UPDATE' })), ...needs.map(item => ({ ...item, targetType: 'FOOD_NEED' }))];
  }

  async reviewPending(targetType: string, targetId: string, actorId: string, action: unknown, version: unknown, notes: unknown) {
    if (!['UPDATE', 'FOOD_NEED'].includes(targetType) || !['APPROVE', 'REJECT'].includes(String(action)) ||
        typeof version !== 'string' || !Number.isFinite(Date.parse(version)) || typeof notes !== 'string' || notes.trim().length < 5 || notes.trim().length > 1000) {
      throw new AppError('A valid content version, decision, and 5–1000 characters of review notes are required.', 400);
    }
    return db.$transaction(async tx => {
      const where = { id: targetId, updatedAt: new Date(version), moderationStatus: 'PENDING', ngo: { status: 'APPROVED' as const, isActive: true } };
      const moderationStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const result = targetType === 'UPDATE'
        ? await tx.update.updateMany({ where: { ...where, status: 'PUBLISHED', isFlagged: false }, data: { moderationStatus, ...(action === 'REJECT' ? { status: 'DRAFT' as const } : {}) } })
        : await tx.foodNeed.updateMany({ where: { ...where, status: 'OPEN', isSafetyHidden: false }, data: { moderationStatus } });
      if (!result.count) throw new AppError('Content changed or was already reviewed. Refresh before deciding.', 409);
      await tx.auditLog.create({ data: { action: 'SAFETY_REPORT_REVIEWED', actorId, actorRole: 'ADMIN', entityType: targetType === 'UPDATE' ? 'UPDATE' : 'FOOD_NEED', entityId: targetId,
        notes: `Pre-publication ${String(action)}: ${notes.trim()}` } });
      return { id: targetId, moderationStatus };
    });
  }

  async reports(status = 'OPEN', page = 1) {
    if (!['OPEN', 'RESOLVED', 'DISMISSED'].includes(status)) throw new AppError('Invalid report status', 400);
    const take = 25;
    const where = { status };
    const [items, total] = await Promise.all([
      db.safetyReport.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * take, take }),
      db.safetyReport.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }

  async review(id: string, actor: { id: string; role: string; canApproveNgos: boolean }, action: unknown, notes: unknown) {
    if (!['DISMISS', 'REMOVE_CONTENT', 'RESOLVE'].includes(String(action)) || typeof notes !== 'string' || notes.trim().length < 5 || notes.trim().length > 1000) {
      throw new AppError('Choose an action and enter 5–1000 characters of review notes.', 400);
    }
    return db.$transaction(async tx => {
      // Claim the report in the same transaction as moderation; a second reviewer cannot overwrite it.
      const claimed = await tx.safetyReport.updateMany({ where: { id, status: 'OPEN' }, data: {
        status: action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED', resolution: notes.trim(), reviewedAt: new Date(), reviewedById: actor.id,
      } });
      if (!claimed.count) throw new AppError('Report was not found or has already been reviewed. Refresh the queue.', 409);
      const report = await tx.safetyReport.findUniqueOrThrow({ where: { id } });
      if (action === 'REMOVE_CONTENT') {
        if (report.targetType === 'UPDATE') {
          await tx.update.updateMany({ where: { id: report.targetId }, data: {
            isFlagged: true, flaggedReason: notes.trim(), flaggedAt: new Date(), flaggedById: actor.id,
          } });
        } else if (report.targetType === 'FOOD_NEED') {
          await tx.foodNeed.updateMany({ where: { id: report.targetId }, data: { status: 'CLOSED', isSafetyHidden: true } });
        } else {
          if (actor.role !== 'SUPER_ADMIN' && !actor.canApproveNgos) throw new AppError('Organisation suspension requires NGO approval permission.', 403);
          await tx.nGO.updateMany({ where: { id: report.ngoId }, data: { status: 'SUSPENDED', isActive: false, suspendedAt: new Date() } });
        }
      }
      // Do not put the private report text or reporter identity in general logs.
      await tx.auditLog.create({ data: { action: 'SAFETY_REPORT_REVIEWED', actorId: actor.id, actorRole: actor.role as 'ADMIN' | 'SUPER_ADMIN',
        entityType: report.targetType === 'UPDATE' ? 'UPDATE' : report.targetType === 'NGO' ? 'NGO' : 'FOOD_NEED',
        entityId: report.targetId, notes: `Safety report ${id}: ${String(action)}` } });
      return { id: report.id, status: report.status };
    });
  }
}
export default new SafetyService();
