import db from '../config/database';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { generateUniqueSlug } from '../utils/slugify';
import {
  getPaginationParams,
  buildPaginatedResponse,
} from '../utils/pagination';
import {
  NGOStatus,
  NGOCategory,
  NGOMemberRole,
  MemberStatus,
} from '@prisma/client';
import { CreateNGOInput, UpdateNGOInput, NGOQueryFilters } from '../types';
import emailService from './email.service';

export class NGOService {
  // Register a new NGO
  async registerNGO(input: CreateNGOInput, managerId: string) {
    // Check if this user already manages an NGO
    const existingNGO = await db.nGO.findUnique({
      where: { managerId },
    });

    if (existingNGO) {
      throw new AppError(
        'You already have a registered NGO. Each account can only manage one NGO.',
        409
      );
    }

    // Check if NGO email is already in use
    const emailTaken = await db.nGO.findUnique({
      where: { email: input.email },
    });

    if (emailTaken) {
      throw new AppError('An NGO with this email address already exists.', 409);
    }

    // Generate a unique slug from the NGO name
    const slug = await generateUniqueSlug(input.name, async (slug) => {
      const existing = await db.nGO.findUnique({ where: { slug } });
      return !!existing;
    });

    const ngo = await db.nGO.create({
      data: {
        name: input.name,
        slug,
        email: input.email.toLowerCase().trim(),
        phone: input.phone,
        logoUrl: input.logoUrl || null,
        coverUrl: input.coverUrl || null,
        description: input.description,
        craNumber: input.craNumber || null,
        orgType: input.orgType || null,
        primaryContactName: input.primaryContactName || null,
        primaryContactTitle: input.primaryContactTitle || null,
        mission: input.mission,
        category: input.category as NGOCategory,
        website: input.website,
        address: input.address,
        city: input.city ?? 'Winnipeg',
        province: input.province ?? 'Manitoba',
        country: input.country ?? 'Canada',
        postalCode: input.postalCode,
        managerId,
        lastSubmittedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        description: true,
        mission: true,
        category: true,
        website: true,
        address: true,
        city: true,
        province: true,
        country: true,
        postalCode: true,
        status: true,
        logoUrl: true,
        coverUrl: true,
        createdAt: true,
      },
    });

    // Automatically create an OWNER membership for the manager
    await db.nGOMember.create({
      data: {
        ngoId: ngo.id,
        userId: managerId,
        invitedById: managerId,
        role: NGOMemberRole.OWNER,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
        canPostNeeds: true,
        canPostUpdates: true,
        canManagePledges: true,
        canViewDonations: true,
        canManageMembers: true,
      },
    });

    logger.info(`New NGO registered: ${ngo.name} by manager: ${managerId}`);

    // Send application received email
    await emailService.sendNGOApplicationReceived(ngo.email, ngo.name);

    return ngo;
  }

  // Get a single NGO by ID or slug
  async getNGO(identifier: string) {
    // Try to find by ID first, then by slug
    const ngo = await db.nGO.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        status: NGOStatus.APPROVED,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        description: true,
        craNumber: true,
        orgType: true,
        primaryContactName: true,
        primaryContactTitle: true,
        mission: true,
        category: true,
        website: true,
        address: true,
        city: true,
        province: true,
        country: true,
        postalCode: true,
        status: true,
        logoUrl: true,
        coverUrl: true,
        verifiedAt: true,
        createdAt: true,
        // Include recent updates
        updates: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            summary: true,
            coverImageUrl: true,
            type: true,
            publishedAt: true,
          },
        },
        // Include active food needs
        foodNeeds: {
          where: { status: 'OPEN' },
          orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
          take: 10,
          select: {
            id: true,
            title: true,
            itemName: true,
            itemCategory: true,
            unit: true,
            quantityRequired: true,
            quantityFulfilled: true,
            isUrgent: true,
            deadline: true,
          },
        },
      },
    });

    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }

    return ngo;
  }

  // Get all approved NGOs with filters
  async getAllNGOs(filters: NGOQueryFilters) {
    const params = getPaginationParams(
      filters.page?.toString(),
      filters.limit?.toString()
    );

    const where: any = {
      status: NGOStatus.APPROVED,
      isActive: true,
    };

    if (filters.category) {
      where.category = filters.category as NGOCategory;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [ngos, total] = await Promise.all([
      db.nGO.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { verifiedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          craNumber: true,
          orgType: true,
          primaryContactName: true,
          primaryContactTitle: true,
          category: true,
          logoUrl: true,
          city: true,
          province: true,
          verifiedAt: true,
          // Include count of active food needs
          _count: {
            select: {
              foodNeeds: {
                where: { status: 'OPEN' },
              },
            },
          },
        },
      }),
      db.nGO.count({ where }),
    ]);

    return buildPaginatedResponse(ngos, total, params);
  }

  // Get NGO dashboard data — for NGO manager
  async getNGODashboard(ngoId: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        description: true,
        mission: true,
        category: true,
        website: true,
        address: true,
        city: true,
        province: true,
        country: true,
        postalCode: true,
        status: true,
        logoUrl: true,
        coverUrl: true,
        rejectionReason: true,
        resubmissionCount: true,
        lastSubmittedAt: true,
        verifiedAt: true,
        stripeAccountId: true,
        createdAt: true,
      },
    });

    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }

    // Get summary statistics
    const [totalDonations, activePledges, openNeeds, totalMembers] =
      await Promise.all([
        db.donation.aggregate({
          where: { ngoId, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        db.foodPledge.count({
          where: { ngoId, status: { in: ['PENDING', 'CONFIRMED'] } },
        }),
        db.foodNeed.count({
          where: { ngoId, status: 'OPEN' },
        }),
        db.nGOMember.count({
          where: { ngoId, status: 'ACTIVE' },
        }),
      ]);

    return {
      ngo,
      stats: {
        totalDonationsAmount: totalDonations._sum.amount ?? 0,
        totalDonationsCount: totalDonations._count,
        activePledges,
        openNeeds,
        totalMembers,
      },
    };
  }

  // Update NGO profile
  async updateNGO(ngoId: string, input: UpdateNGOInput) {
    // Check if new email is already taken by another NGO
    if (input.email) {
      const emailTaken = await db.nGO.findFirst({
        where: {
          email: input.email.toLowerCase().trim(),
          NOT: { id: ngoId },
        },
      });

      if (emailTaken) {
        throw new AppError(
          'An NGO with this email address already exists.',
          409
        );
      }
    }

    const ngo = await db.nGO.update({
      where: { id: ngoId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email.toLowerCase().trim() }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.description && { description: input.description }),
        ...(input.mission !== undefined && { mission: input.mission }),
        ...(input.craNumber !== undefined && { craNumber: input.craNumber }),
        ...(input.orgType !== undefined && { orgType: input.orgType }),
        ...(input.primaryContactName !== undefined && {
          primaryContactName: input.primaryContactName,
        }),
        ...(input.primaryContactTitle !== undefined && {
          primaryContactTitle: input.primaryContactTitle,
        }),
        ...(input.category && { category: input.category as NGOCategory }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.address && { address: input.address }),
        ...(input.city && { city: input.city }),
        ...(input.province && { province: input.province }),
        ...(input.country && { country: input.country }),
        ...(input.postalCode && { postalCode: input.postalCode }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        description: true,
        category: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info(`NGO updated: ${ngoId}`);

    return ngo;
  }

  // Resubmit NGO after rejection
  async resubmitNGO(ngoId: string, managerId: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
    });

    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }

    if (ngo.managerId !== managerId) {
      throw new AppError('You are not authorised to resubmit this NGO.', 403);
    }

    if (ngo.status !== NGOStatus.REJECTED) {
      throw new AppError('Only rejected NGOs can be resubmitted.', 400);
    }

    // Block resubmission after 3 attempts
    if (ngo.resubmissionCount >= 3) {
      throw new AppError(
        'Maximum resubmission attempts reached. Please contact support.',
        400
      );
    }

    const updated = await db.nGO.update({
      where: { id: ngoId },
      data: {
        status: NGOStatus.RESUBMITTED,
        resubmissionCount: { increment: 1 },
        lastSubmittedAt: new Date(),
        rejectionReason: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        resubmissionCount: true,
        lastSubmittedAt: true,
      },
    });

    logger.info(
      `NGO resubmitted: ${ngoId} attempt: ${updated.resubmissionCount}`
    );

    return updated;
  }

  // Admin — get all NGOs with any status
  async adminGetAllNGOs(
    page?: string,
    limit?: string,
    status?: string,
    search?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = {};

    if (status) {
      where.status = status as NGOStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [ngos, total] = await Promise.all([
      db.nGO.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          category: true,
          status: true,
          city: true,
          resubmissionCount: true,
          lastSubmittedAt: true,
          verifiedAt: true,
          createdAt: true,
          manager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.nGO.count({ where }),
    ]);

    return buildPaginatedResponse(ngos, total, params);
  }

  // Admin — approve an NGO
  async approveNGO(ngoId: string, adminId: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      include: {
        manager: {
          select: { email: true },
        },
      },
    });
    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }
    if (ngo.status === NGOStatus.APPROVED) {
      throw new AppError('This NGO is already approved.', 409);
    }

    const updated = await db.nGO.update({
      where: { id: ngoId },
      data: {
        status: NGOStatus.APPROVED,
        verifiedAt: new Date(),
        verifiedById: adminId,
        rejectionReason: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        verifiedAt: true,
      },
    });

    // Send approval email after successful update

    if (ngo.manager?.email) {
      await emailService.sendNGOApproved(ngo.manager.email, ngo.name);
    }

    logger.info(`NGO approved: ${ngoId} by admin: ${adminId}`);

    return updated;
  }

  // Admin — reject an NGO
  async rejectNGO(ngoId: string, adminId: string, reason: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      include: {
        manager: {
          select: { email: true },
        },
      },
    });
    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }
    if (ngo.status === NGOStatus.REJECTED) {
      throw new AppError('This NGO is already rejected.', 409);
    }

    const updated = await db.nGO.update({
      where: { id: ngoId },
      data: {
        status: NGOStatus.REJECTED,
        rejectionReason: reason,
      },
      select: {
        id: true,
        name: true,
        status: true,
        rejectionReason: true,
      },
    });

    // Send rejection email after successful update
    if (ngo.manager?.email) {
      await emailService.sendNGORejected(ngo.manager.email, ngo.name, reason);
    }

    logger.info(`NGO rejected: ${ngoId} by admin: ${adminId}`);

    return updated;
  }

  // Admin — suspend an approved NGO
  async suspendNGO(ngoId: string, adminId: string, reason: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
    });

    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }

    if (ngo.status !== NGOStatus.APPROVED) {
      throw new AppError('Only approved NGOs can be suspended.', 400);
    }

    const updated = await db.nGO.update({
      where: { id: ngoId },
      data: {
        status: NGOStatus.SUSPENDED,
        isActive: false,
        suspendedAt: new Date(),
        rejectionReason: reason,
      },
      select: {
        id: true,
        name: true,
        status: true,
        suspendedAt: true,
      },
    });

    logger.info(`NGO suspended: ${ngoId} by admin: ${adminId}`);

    return updated;
  }

  // Get NGO members
  async getNGOMembers(ngoId: string) {
    const members = await db.nGOMember.findMany({
      where: { ngoId, status: MemberStatus.ACTIVE },
      select: {
        id: true,
        role: true,
        status: true,
        canPostNeeds: true,
        canPostUpdates: true,
        canManagePledges: true,
        canViewDonations: true,
        canManageMembers: true,
        joinedAt: true,
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
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  // Remove a member from an NGO
  async removeMember(ngoId: string, memberId: string, requesterId: string) {
    const member = await db.nGOMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.ngoId !== ngoId) {
      throw new AppError('Member not found', 404);
    }

    // Cannot remove the OWNER
    if (member.role === NGOMemberRole.OWNER) {
      throw new AppError('The NGO owner cannot be removed.', 403);
    }

    await db.nGOMember.update({
      where: { id: memberId },
      data: { status: MemberStatus.REMOVED },
    });

    logger.info(
      `NGO member removed: ${memberId} from NGO: ${ngoId} by: ${requesterId}`
    );
  }

  // Get a single NGO by ID for admin — no status filter
  async getNGOForAdmin(ngoId: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      select: {
        id: true,
        name: true,
        status: true,
        rejectionReason: true,
      },
    });

    if (!ngo) {
      throw new AppError('NGO not found', 404);
    }

    return ngo;
  }
}

export default new NGOService();
