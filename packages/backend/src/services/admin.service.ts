import db from '../config/database';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import {
  getPaginationParams,
  buildPaginatedResponse,
} from '../utils/pagination';
import {
  AuditAction,
  AuditEntityType,
  AdminDepartment,
  MemberStatus,
  Role,
} from '@prisma/client';
import invitationService from './invitation.service';

export class AdminService {
  // Get platform-wide analytics
  async getPlatformAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDonors,
      totalNGOs,
      approvedNGOs,
      pendingNGOs,
      totalDonations,
      totalDonationsLast30Days,
      totalPledges,
      fulfilledPledges,
      totalUpdates,
      newDonorsLast7Days,
      newDonorsLast30Days,
    ] = await Promise.all([
      // Total donor count
      db.user.count({ where: { role: Role.DONOR, isActive: true } }),

      // Total NGO count
      db.nGO.count(),

      // Approved NGOs
      db.nGO.count({ where: { status: 'APPROVED' } }),

      // Pending NGOs — admin attention needed
      db.nGO.count({ where: { status: { in: ['PENDING', 'RESUBMITTED'] } } }),

      // All time donation totals
      db.donation.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),

      // Donations in last 30 days
      db.donation.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Total pledges
      db.foodPledge.count(),

      // Fulfilled pledges
      db.foodPledge.count({ where: { status: 'FULFILLED' } }),

      // Published updates
      db.update.count({ where: { status: 'PUBLISHED' } }),

      // New donors last 7 days
      db.user.count({
        where: {
          role: Role.DONOR,
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // New donors last 30 days
      db.user.count({
        where: {
          role: Role.DONOR,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const pledgeFulfilmentRate =
      totalPledges > 0
        ? Math.round((fulfilledPledges / totalPledges) * 100)
        : 0;

    return {
      donors: {
        total: totalDonors,
        newLast7Days: newDonorsLast7Days,
        newLast30Days: newDonorsLast30Days,
      },
      ngos: {
        total: totalNGOs,
        approved: approvedNGOs,
        pendingReview: pendingNGOs,
      },
      donations: {
        totalAmount: totalDonations._sum.amount ?? 0,
        totalCount: totalDonations._count,
        last30DaysAmount: totalDonationsLast30Days._sum.amount ?? 0,
        last30DaysCount: totalDonationsLast30Days._count,
      },
      pledges: {
        total: totalPledges,
        fulfilled: fulfilledPledges,
        fulfilmentRate: `${pledgeFulfilmentRate}%`,
      },
      content: {
        publishedUpdates: totalUpdates,
      },
    };
  }

  // Get AuditLog with filters — SUPER_ADMIN only
  async getAuditLogs(
    page?: string,
    limit?: string,
    action?: string,
    entityType?: string,
    actorId?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = {};

    if (action) where.action = action as AuditAction;
    if (entityType) where.entityType = entityType as AuditEntityType;
    if (actorId) where.actorId = actorId;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          actorRole: true,
          entityType: true,
          entityId: true,
          previousState: true,
          newState: true,
          ipAddress: true,
          notes: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return buildPaginatedResponse(logs, total, params);
  }

  // Invite a new admin team member — SUPER_ADMIN only.
  // Delegates to the invitation service: a token-based Invitation is created
  // and emailed to the invitee. No User, AdminMember, or permission state is
  // written until the invitee accepts.
  async inviteAdmin(
    email: string,
    department: AdminDepartment,
    permissions: {
      canApproveNgos?: boolean;
      canManageUsers?: boolean;
      canManageContent?: boolean;
      canViewAnalytics?: boolean;
      canManageDonations?: boolean;
    },
    superAdminId: string
  ) {
    const invitation = await invitationService.createAdminInvitation({
      email,
      department,
      permissions,
      invitedById: superAdminId,
    });

    logger.info(
      `Admin invitation created via admin service: ${email} by SUPER_ADMIN: ${superAdminId}`
    );

    return invitation;
  }

  // Update admin permissions — SUPER_ADMIN only
  async updateAdminPermissions(
    adminUserId: string,
    permissions: {
      canApproveNgos?: boolean;
      canManageUsers?: boolean;
      canManageContent?: boolean;
      canViewAnalytics?: boolean;
      canManageDonations?: boolean;
    },
    superAdminId: string
  ) {
    const user = await db.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role !== Role.ADMIN) {
      throw new AppError('This user is not an admin', 400);
    }

    // Cannot modify your own permissions
    if (adminUserId === superAdminId) {
      throw new AppError('You cannot modify your own permissions', 403);
    }

    // Update both User and AdminMember records
    const [updatedUser] = await db.$transaction([
      db.user.update({
        where: { id: adminUserId },
        data: {
          ...(permissions.canApproveNgos !== undefined && {
            canApproveNgos: permissions.canApproveNgos,
          }),
          ...(permissions.canManageUsers !== undefined && {
            canManageUsers: permissions.canManageUsers,
          }),
          ...(permissions.canManageContent !== undefined && {
            canManageContent: permissions.canManageContent,
          }),
          ...(permissions.canViewAnalytics !== undefined && {
            canViewAnalytics: permissions.canViewAnalytics,
          }),
          ...(permissions.canManageDonations !== undefined && {
            canManageDonations: permissions.canManageDonations,
          }),
        },
        select: {
          id: true,
          email: true,
          role: true,
          canApproveNgos: true,
          canManageUsers: true,
          canManageContent: true,
          canViewAnalytics: true,
          canManageDonations: true,
        },
      }),
      db.adminMember.update({
        where: { userId: adminUserId },
        data: {
          ...(permissions.canApproveNgos !== undefined && {
            canApproveNgos: permissions.canApproveNgos,
          }),
          ...(permissions.canManageUsers !== undefined && {
            canManageUsers: permissions.canManageUsers,
          }),
          ...(permissions.canManageContent !== undefined && {
            canManageContent: permissions.canManageContent,
          }),
          ...(permissions.canViewAnalytics !== undefined && {
            canViewAnalytics: permissions.canViewAnalytics,
          }),
          ...(permissions.canManageDonations !== undefined && {
            canManageDonations: permissions.canManageDonations,
          }),
        },
      }),
    ]);

    logger.info(
      `Admin permissions updated: ${adminUserId} by SUPER_ADMIN: ${superAdminId}`
    );

    return updatedUser;
  }

  // Remove an admin team member — SUPER_ADMIN only
  async removeAdmin(adminUserId: string, superAdminId: string) {
    const user = await db.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role !== Role.ADMIN) {
      throw new AppError('This user is not an admin', 400);
    }

    if (adminUserId === superAdminId) {
      throw new AppError('You cannot remove yourself', 403);
    }

    // Downgrade role to DONOR and clear all permission flags
    await db.$transaction([
      db.user.update({
        where: { id: adminUserId },
        data: {
          role: Role.DONOR,
          canApproveNgos: false,
          canManageUsers: false,
          canManageContent: false,
          canViewAnalytics: false,
          canManageAdmins: false,
          canManageDonations: false,
        },
      }),
      db.adminMember.update({
        where: { userId: adminUserId },
        data: { status: MemberStatus.REMOVED },
      }),
    ]);

    logger.info(
      `Admin removed: ${adminUserId} by SUPER_ADMIN: ${superAdminId}`
    );
  }

  // Get all admin team members — SUPER_ADMIN only
  async getAdminTeam() {
    const members = await db.adminMember.findMany({
      where: { status: MemberStatus.ACTIVE },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        department: true,
        status: true,
        canApproveNgos: true,
        canManageUsers: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManageDonations: true,
        joinedAt: true,
        lastActiveAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return members;
  }
}

export default new AdminService();
