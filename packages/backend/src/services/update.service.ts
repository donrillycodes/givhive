import db from '../config/database';
import { visibleOrganisation } from './safety.service';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import {
  getPaginationParams,
  buildPaginatedResponse,
} from '../utils/pagination';
import {
  UpdateType,
  UpdateStatus,
  MemberStatus,
  NGOStatus,
} from '@prisma/client';
import { CreateUpdateInput, UpdateUpdateInput } from '../types';

export class UpdateService {
  // Resolve posting permission — same pattern as food needs
  private async resolvePostingNGO(userId: string): Promise<string> {
    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        status: MemberStatus.ACTIVE,
        canPostUpdates: true,
        ngo: {
          status: NGOStatus.APPROVED,
          isActive: true,
        },
      },
      select: { ngoId: true },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to post updates. Only active members of an approved NGO with posting permissions can create updates.',
        403
      );
    }

    return membership.ngoId;
  }

  // Create a new update — saved as DRAFT by default
  async createUpdate(input: CreateUpdateInput, userId: string) {
    const ngoId = await this.resolvePostingNGO(userId);

    // Validate type
    const validTypes = Object.values(UpdateType);
    if (!validTypes.includes(input.type as UpdateType)) {
      throw new AppError(
        `Invalid update type. Must be one of: ${validTypes.join(', ')}`,
        400
      );
    }

    // If pinning enforce only one pinned update per NGO
    if (input.isPinned) {
      await db.update.updateMany({
        where: { ngoId, isPinned: true },
        data: { isPinned: false },
      });
    }

    const update = await db.update.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        summary: input.summary?.trim(),
        type: input.type as UpdateType,
        status: UpdateStatus.DRAFT,
        isPinned: input.isPinned ?? false,
        ngoId,
        postedById: userId,
      },
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        type: true,
        status: true,
        isPinned: true,
        coverImageUrl: true,
        createdAt: true,
        ngo: {
          select: { id: true, name: true, slug: true },
        },
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(
      `Update created: ${update.id} by user: ${userId} for NGO: ${ngoId}`
    );

    return update;
  }

  // Publish a draft update — makes it visible on the donor feed
  async publishUpdate(updateId: string, userId: string) {
    const update = await db.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        ngoId: true,
        status: true,
        isFlagged: true,
        moderationStatus: true,
      },
    });

    if (!update) {
      throw new AppError('Update not found', 404);
    }

    // Verify membership
    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        ngoId: update.ngoId,
        status: MemberStatus.ACTIVE,
        canPostUpdates: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to publish updates for this NGO',
        403
      );
    }

    if (update.status !== UpdateStatus.DRAFT) {
      throw new AppError('Only draft updates can be published', 400);
    }

    // Cannot publish a flagged update
    if (update.isFlagged) {
      throw new AppError(
        'This update has been flagged by an admin and cannot be published until the flag is resolved.',
        400
      );
    }

    const published = await db.update.update({
      where: { id: updateId },
      data: {
        status: UpdateStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
      },
    });

    logger.info(`Update published: ${updateId} by user: ${userId}`);

    return published;
  }

  // Get a single update by ID — public if published
  async getUpdateById(updateId: string, requesterId?: string) {
    const update = await db.update.findFirst({
      where: { id: updateId, status: 'PUBLISHED', isFlagged: false, moderationStatus: 'APPROVED', ngo: { status: 'APPROVED', isActive: true, ...visibleOrganisation(requesterId) } },
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        type: true,
        status: true,
        isPinned: true,
        isFlagged: true,
        moderationStatus: true,
        coverImageUrl: true,
        viewsCount: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        ngo: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!update) {
      throw new AppError('Update not found', 404);
    }

    // Only published and non-flagged updates are public
    if (update.status !== UpdateStatus.PUBLISHED || update.isFlagged) {
      // NGO members and admins can still view it
      if (!requesterId) {
        throw new AppError('Update not found', 404);
      }
    }

    // Increment view count for published updates
    if (update.status === UpdateStatus.PUBLISHED) {
      await db.update.update({
        where: { id: updateId },
        data: { viewsCount: { increment: 1 } },
      });
    }

    return update;
  }

  // Get all published updates for the donor home feed
  async getPublishedUpdates(
    page?: string,
    limit?: string,
    type?: string,
    ngoId?: string,
    search?: string,
    userId?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = {
      status: UpdateStatus.PUBLISHED,
      isFlagged: false,
      moderationStatus: 'APPROVED',
      ngo: {
        status: NGOStatus.APPROVED,
        isActive: true,
        ...visibleOrganisation(userId),
      },
    };

    if (type) {
      where.type = type as UpdateType;
    }

    if (ngoId) {
      where.ngoId = ngoId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [updates, total] = await Promise.all([
      db.update.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        // Pinned updates always appear first
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          summary: true,
          type: true,
          isPinned: true,
          coverImageUrl: true,
          viewsCount: true,
          publishedAt: true,
          ngo: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
      }),
      db.update.count({ where }),
    ]);

    return buildPaginatedResponse(updates, total, params);
  }

  // Update content — NGO only, only drafts can be edited
  async updateContent(
    updateId: string,
    input: UpdateUpdateInput,
    userId: string
  ) {
    const update = await db.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        ngoId: true,
        status: true,
        isPinned: true,
      },
    });

    if (!update) {
      throw new AppError('Update not found', 404);
    }

    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        ngoId: update.ngoId,
        status: MemberStatus.ACTIVE,
        canPostUpdates: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to edit updates for this NGO',
        403
      );
    }

    if (update.status !== UpdateStatus.DRAFT) {
      throw new AppError(
        'Only draft updates can be edited. Archive and recreate if changes are needed.',
        400
      );
    }

    // Handle pin toggle — unpin others if pinning this one
    if (input.isPinned && !update.isPinned) {
      await db.update.updateMany({
        where: { ngoId: update.ngoId, isPinned: true },
        data: { isPinned: false },
      });
    }

    const updated = await db.update.update({
      where: { id: updateId },
      data: {
        moderationStatus: 'PENDING',
        ...(input.title && { title: input.title.trim() }),
        ...(input.body && { body: input.body.trim() }),
        ...(input.summary !== undefined && {
          summary: input.summary?.trim(),
        }),
        ...(input.type && { type: input.type as UpdateType }),
        ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        isPinned: true,
        updatedAt: true,
      },
    });

    logger.info(`Update edited: ${updateId} by user: ${userId}`);

    return updated;
  }

  // Archive an update — removes from donor feed
  async archiveUpdate(updateId: string, userId: string) {
    const update = await db.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        ngoId: true,
        status: true,
      },
    });

    if (!update) {
      throw new AppError('Update not found', 404);
    }

    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        ngoId: update.ngoId,
        status: MemberStatus.ACTIVE,
        canPostUpdates: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to archive updates for this NGO',
        403
      );
    }

    if (update.status === UpdateStatus.ARCHIVED) {
      throw new AppError('This update is already archived', 400);
    }

    const archived = await db.update.update({
      where: { id: updateId },
      data: { status: UpdateStatus.ARCHIVED, isPinned: false },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info(`Update archived: ${updateId} by user: ${userId}`);

    return archived;
  }

  // Get updates for NGO dashboard — all statuses
  async getNGOUpdates(
    ngoId: string,
    page?: string,
    limit?: string,
    status?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = { ngoId };

    if (status) {
      where.status = status as UpdateStatus;
    }

    const [updates, total] = await Promise.all([
      db.update.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          summary: true,
          type: true,
          status: true,
          isPinned: true,
          isFlagged: true,
        moderationStatus: true,
          viewsCount: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      db.update.count({ where }),
    ]);

    return buildPaginatedResponse(updates, total, params);
  }

  // Admin — flag an update
  async flagUpdate(updateId: string, adminId: string, reason: string) {
    const update = await db.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        status: true,
        isFlagged: true,
        moderationStatus: true,
      },
    });

    if (!update) {
      throw new AppError('Update not found', 404);
    }

    if (update.isFlagged) {
      throw new AppError('This update is already flagged', 409);
    }

    const flagged = await db.update.update({
      where: { id: updateId },
      data: {
        isFlagged: true,
        flaggedReason: reason,
        flaggedAt: new Date(),
        flaggedById: adminId,
        // Hide from donor feed immediately
        status: UpdateStatus.ARCHIVED,
      },
      select: {
        id: true,
        title: true,
        isFlagged: true,
        moderationStatus: true,
        flaggedReason: true,
        flaggedAt: true,
        status: true,
      },
    });

    logger.info(
      `Update flagged: ${updateId} by admin: ${adminId} reason: ${reason}`
    );

    return flagged;
  }

  // Get update for audit log
  async getUpdateForAudit(updateId: string) {
    const update = await db.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        title: true,
        status: true,
        isFlagged: true,
        moderationStatus: true,
        ngoId: true,
      },
    });

    if (!update) {
      throw new AppError('Update not found', 404);
    }

    return update;
  }

  // Admin — get all updates across platform
  async adminGetAllUpdates(
    page?: string,
    limit?: string,
    status?: string,
    isFlagged?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = {};

    if (status) where.status = status as UpdateStatus;
    if (isFlagged !== undefined) where.isFlagged = isFlagged === 'true';

    const [updates, total] = await Promise.all([
      db.update.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          isFlagged: true,
        moderationStatus: true,
          flaggedReason: true,
          viewsCount: true,
          publishedAt: true,
          createdAt: true,
          ngo: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      db.update.count({ where }),
    ]);

    return buildPaginatedResponse(updates, total, params);
  }
}

export default new UpdateService();
