import db from '../config/database';
import { visibleOrganisation } from './safety.service';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import {
  getPaginationParams,
  buildPaginatedResponse,
} from '../utils/pagination';
import {
  FoodItemCategory,
  FoodNeedStatus,
  MemberStatus,
  NGOStatus,
} from '@prisma/client';
import { CreateFoodNeedInput, UpdateFoodNeedInput } from '../types';

export class FoodNeedService {
  // Resolve the NGO this user is allowed to post food needs for
  // Never trusts ngoId from the client — always derived from membership
  private async resolvePostingNGO(userId: string): Promise<string> {
    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        status: MemberStatus.ACTIVE,
        canPostNeeds: true,
        ngo: {
          status: NGOStatus.APPROVED,
          isActive: true,
        },
      },
      select: { ngoId: true },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to post food needs. Only active members of an approved NGO with posting permissions can create food needs.',
        403
      );
    }

    return membership.ngoId;
  }

  // Validate and parse deadline
  private parseDeadline(deadline?: string): Date | undefined {
    if (!deadline) return undefined;

    const parsed = new Date(deadline);

    if (Number.isNaN(parsed.getTime())) {
      throw new AppError('Deadline must be a valid ISO 8601 date string', 400);
    }

    if (parsed.getTime() <= Date.now()) {
      throw new AppError('Deadline must be in the future', 400);
    }

    return parsed;
  }

  // Create a new food need
  async createFoodNeed(input: CreateFoodNeedInput, userId: string) {
    const ngoId = await this.resolvePostingNGO(userId);

    // Validate category
    const validCategories = Object.values(FoodItemCategory);
    if (!validCategories.includes(input.itemCategory as FoodItemCategory)) {
      throw new AppError(
        `Invalid item category. Must be one of: ${validCategories.join(', ')}`,
        400
      );
    }

    // Validate quantity
    if (
      !Number.isInteger(input.quantityRequired) ||
      input.quantityRequired < 1
    ) {
      throw new AppError(
        'Quantity required must be a positive whole number',
        400
      );
    }

    // Enforce urgent needs limit — max 3 urgent needs per NGO at a time
    if (input.isUrgent) {
      const urgentCount = await db.foodNeed.count({
        where: {
          ngoId,
          isUrgent: true,
          status: FoodNeedStatus.OPEN,
        },
      });

      if (urgentCount >= 3) {
        throw new AppError(
          'You can only have 3 urgent food needs active at a time. Please resolve an existing urgent need before adding another.',
          400
        );
      }
    }

    const deadline = this.parseDeadline(input.deadline);

    const foodNeed = await db.foodNeed.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim(),
        itemName: input.itemName.trim(),
        itemCategory: input.itemCategory as FoodItemCategory,
        unit: input.unit.trim(),
        quantityRequired: input.quantityRequired,
        quantityFulfilled: 0,
        status: FoodNeedStatus.OPEN,
        isUrgent: input.isUrgent ?? false,
        dropOffAddress: input.dropOffAddress?.trim(),
        dropOffInstructions: input.dropOffInstructions?.trim(),
        deadline,
        ngoId,
        postedById: userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        itemName: true,
        itemCategory: true,
        unit: true,
        quantityRequired: true,
        quantityFulfilled: true,
        status: true,
        moderationStatus: true,
        isUrgent: true,
        dropOffAddress: true,
        dropOffInstructions: true,
        deadline: true,
        imageUrl: true,
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
      `Food need created: ${foodNeed.id} by user: ${userId} for NGO: ${ngoId}`
    );

    return foodNeed;
  }

  // Get a single food need by ID — public
  async getFoodNeedById(foodNeedId: string, userId?: string) {
    const foodNeed = await db.foodNeed.findFirst({
      where: { id: foodNeedId, isSafetyHidden: false, moderationStatus: 'APPROVED', ngo: { status: 'APPROVED', isActive: true, ...visibleOrganisation(userId) } },
      select: {
        id: true,
        title: true,
        description: true,
        itemName: true,
        itemCategory: true,
        unit: true,
        quantityRequired: true,
        quantityFulfilled: true,
        status: true,
        moderationStatus: true,
        isUrgent: true,
        dropOffAddress: true,
        dropOffInstructions: true,
        deadline: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        ngo: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            address: true,
            city: true,
          },
        },
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        // Include recent pledges count
        _count: {
          select: { pledges: true },
        },
      },
    });

    if (!foodNeed) {
      throw new AppError('Food need not found', 404);
    }

    return foodNeed;
  }

  // Get all open food needs — public with filters
  async getAllFoodNeeds(
    page?: string,
    limit?: string,
    category?: string,
    ngoId?: string,
    isUrgent?: string,
    search?: string,
    userId?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = {
      status: FoodNeedStatus.OPEN,
      isSafetyHidden: false,
      moderationStatus: 'APPROVED',
      ngo: {
        status: NGOStatus.APPROVED,
        isActive: true,
        ...visibleOrganisation(userId),
      },
    };

    if (category) {
      where.itemCategory = category as FoodItemCategory;
    }

    if (ngoId) {
      where.ngoId = ngoId;
    }

    if (isUrgent === 'true') {
      where.isUrgent = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [foodNeeds, total] = await Promise.all([
      db.foodNeed.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        // Urgent needs always appear first, then by newest
        orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          itemName: true,
          itemCategory: true,
          unit: true,
          quantityRequired: true,
          quantityFulfilled: true,
          status: true,
        moderationStatus: true,
          isUrgent: true,
          deadline: true,
          imageUrl: true,
          createdAt: true,
          ngo: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              city: true,
            },
          },
        },
      }),
      db.foodNeed.count({ where }),
    ]);

    return buildPaginatedResponse(foodNeeds, total, params);
  }

  // Update a food need — NGO only
  async updateFoodNeed(
    foodNeedId: string,
    input: UpdateFoodNeedInput,
    userId: string
  ) {
    const foodNeed = await db.foodNeed.findUnique({
      where: { id: foodNeedId },
      select: {
        id: true,
        ngoId: true,
        status: true,
        moderationStatus: true,
        isUrgent: true,
        postedById: true,
      },
    });

    if (!foodNeed) {
      throw new AppError('Food need not found', 404);
    }

    // Verify the user belongs to the NGO that owns this need
    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        ngoId: foodNeed.ngoId,
        status: MemberStatus.ACTIVE,
        canPostNeeds: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to update this food need',
        403
      );
    }

    // Cannot update a closed or fulfilled need
    if (
      foodNeed.status === FoodNeedStatus.CLOSED ||
      foodNeed.status === FoodNeedStatus.FULFILLED
    ) {
      throw new AppError(
        'Closed or fulfilled food needs cannot be updated',
        400
      );
    }

    // Enforce urgent limit if changing isUrgent from false to true
    if (input.isUrgent && !foodNeed.isUrgent) {
      const urgentCount = await db.foodNeed.count({
        where: {
          ngoId: foodNeed.ngoId,
          isUrgent: true,
          status: FoodNeedStatus.OPEN,
          NOT: { id: foodNeedId },
        },
      });

      if (urgentCount >= 3) {
        throw new AppError(
          'You can only have 3 urgent food needs active at a time.',
          400
        );
      }
    }

    const deadline = input.deadline
      ? this.parseDeadline(input.deadline)
      : undefined;

    const updated = await db.foodNeed.update({
      where: { id: foodNeedId },
      data: { moderationStatus: 'PENDING',
        ...(input.title && { title: input.title.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim(),
        }),
        ...(input.itemName && { itemName: input.itemName.trim() }),
        ...(input.itemCategory && {
          itemCategory: input.itemCategory as FoodItemCategory,
        }),
        ...(input.unit && { unit: input.unit.trim() }),
        ...(input.quantityRequired && {
          quantityRequired: input.quantityRequired,
        }),
        ...(deadline && { deadline }),
        ...(input.dropOffAddress !== undefined && {
          dropOffAddress: input.dropOffAddress?.trim(),
        }),
        ...(input.dropOffInstructions !== undefined && {
          dropOffInstructions: input.dropOffInstructions?.trim(),
        }),
        ...(input.isUrgent !== undefined && { isUrgent: input.isUrgent }),
      },
      select: {
        id: true,
        title: true,
        itemName: true,
        itemCategory: true,
        unit: true,
        quantityRequired: true,
        quantityFulfilled: true,
        status: true,
        moderationStatus: true,
        isUrgent: true,
        deadline: true,
        updatedAt: true,
      },
    });

    logger.info(`Food need updated: ${foodNeedId} by user: ${userId}`);

    return updated;
  }

  // Close a food need — NGO only
  async closeFoodNeed(foodNeedId: string, userId: string) {
    const foodNeed = await db.foodNeed.findUnique({
      where: { id: foodNeedId },
      select: {
        id: true,
        ngoId: true,
        status: true,
        moderationStatus: true,
      },
    });

    if (!foodNeed) {
      throw new AppError('Food need not found', 404);
    }

    // Verify membership
    const membership = await db.nGOMember.findFirst({
      where: {
        userId,
        ngoId: foodNeed.ngoId,
        status: MemberStatus.ACTIVE,
        canPostNeeds: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to close this food need',
        403
      );
    }

    if (foodNeed.status !== FoodNeedStatus.OPEN) {
      throw new AppError('Only open food needs can be closed', 400);
    }

    const updated = await db.foodNeed.update({
      where: { id: foodNeedId },
      data: { status: FoodNeedStatus.CLOSED },
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        updatedAt: true,
      },
    });

    logger.info(`Food need closed: ${foodNeedId} by user: ${userId}`);

    return updated;
  }

  // Get food needs for a specific NGO — NGO dashboard
  async getNGOFoodNeeds(
    ngoId: string,
    page?: string,
    limit?: string,
    status?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = { ngoId };

    if (status) {
      where.status = status as FoodNeedStatus;
    }

    const [foodNeeds, total] = await Promise.all([
      db.foodNeed.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          itemName: true,
          itemCategory: true,
          unit: true,
          quantityRequired: true,
          quantityFulfilled: true,
          status: true,
        moderationStatus: true,
          isUrgent: true,
          deadline: true,
          createdAt: true,
          _count: {
            select: { pledges: true },
          },
        },
      }),
      db.foodNeed.count({ where }),
    ]);

    return buildPaginatedResponse(foodNeeds, total, params);
  }

  // Admin — get all food needs across platform
  async adminGetAllFoodNeeds(
    page?: string,
    limit?: string,
    status?: string,
    ngoId?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = {};

    if (status) where.status = status as FoodNeedStatus;
    if (ngoId) where.ngoId = ngoId;

    const [foodNeeds, total] = await Promise.all([
      db.foodNeed.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          itemName: true,
          itemCategory: true,
          status: true,
        moderationStatus: true,
          isUrgent: true,
          quantityRequired: true,
          quantityFulfilled: true,
          createdAt: true,
          ngo: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      db.foodNeed.count({ where }),
    ]);

    return buildPaginatedResponse(foodNeeds, total, params);
  }

  // Get a food need for admin — no status filter
  async getFoodNeedForAdmin(foodNeedId: string) {
    const foodNeed = await db.foodNeed.findUnique({
      where: { id: foodNeedId },
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        isUrgent: true,
        ngoId: true,
      },
    });

    if (!foodNeed) {
      throw new AppError('Food need not found', 404);
    }

    return foodNeed;
  }
}

export default new FoodNeedService();
