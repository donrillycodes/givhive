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
import emailService from './email.service';

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

  // Invite a new admin team member — SUPER_ADMIN only
  // Creates a PENDING invite ONLY. No role or permissions are granted
  // until the invitee explicitly accepts.
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
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError(
        'No account found with this email. The user must register first.',
        404
      );
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new AppError('This user is already a super admin.', 409);
    }

    const existingMember = await db.adminMember.findUnique({
      where: { userId: user.id },
    });

    if (existingMember && existingMember.status === MemberStatus.PENDING) {
      throw new AppError('This user already has a pending invite.', 409);
    }
    if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
      throw new AppError('This user is already an admin team member.', 409);
    }
    // A previously REMOVED member can be re-invited — clear the old record first
    if (existingMember) {
      await db.adminMember.delete({ where: { userId: user.id } });
    }

    // Create the PENDING invite. Permissions are stored here but NOT yet
    // applied to the user — that happens on accept.
    const adminMember = await db.adminMember.create({
      data: {
        userId: user.id,
        department,
        status: MemberStatus.PENDING,
        invitedById: superAdminId,
        canApproveNgos: permissions.canApproveNgos ?? false,
        canManageUsers: permissions.canManageUsers ?? false,
        canManageContent: permissions.canManageContent ?? false,
        canViewAnalytics: permissions.canViewAnalytics ?? false,
        canManageDonations: permissions.canManageDonations ?? false,
      },
      select: {
        id: true,
        department: true,
        status: true,
        canApproveNgos: true,
        canManageUsers: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManageDonations: true,
        invitedAt: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    const inviter = await db.user.findUnique({
      where: { id: superAdminId },
      select: { firstName: true, lastName: true },
    });

    await emailService.sendAdminInvite(
      user.email,
      inviter ? `${inviter.firstName} ${inviter.lastName}` : 'GivHive Admin'
    );

    logger.info(
      `Admin invite created (pending): ${email} by SUPER_ADMIN: ${superAdminId}`
    );

    return adminMember;
  }

  // Get the current user's pending invite, if any
  async getMyPendingInvite(userId: string) {
    const member = await db.adminMember.findUnique({
      where: { userId },
      select: {
        id: true,
        department: true,
        status: true,
        canApproveNgos: true,
        canManageUsers: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManageDonations: true,
        invitedAt: true,
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!member || member.status !== MemberStatus.PENDING) {
      return null;
    }
    return member;
  }

  // Accept a pending admin invite — promotes the user and activates membership
  async acceptInvite(userId: string) {
    const member = await db.adminMember.findUnique({ where: { userId } });

    if (!member || member.status !== MemberStatus.PENDING) {
      throw new AppError('No pending invite found.', 404);
    }

    const [updatedUser] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          role: Role.ADMIN,
          canApproveNgos: member.canApproveNgos,
          canManageUsers: member.canManageUsers,
          canManageContent: member.canManageContent,
          canViewAnalytics: member.canViewAnalytics,
          canManageDonations: member.canManageDonations,
        },
        select: { id: true, email: true, role: true },
      }),
      db.adminMember.update({
        where: { userId },
        data: { status: MemberStatus.ACTIVE, joinedAt: new Date() },
      }),
    ]);

    logger.info(`Admin invite accepted: ${userId}`);
    return updatedUser;
  }

  // Decline a pending admin invite — removes it, user stays a donor
  async declineInvite(userId: string) {
    const member = await db.adminMember.findUnique({ where: { userId } });

    if (!member || member.status !== MemberStatus.PENDING) {
      throw new AppError('No pending invite found.', 404);
    }

    await db.adminMember.delete({ where: { userId } });
    logger.info(`Admin invite declined: ${userId}`);
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
