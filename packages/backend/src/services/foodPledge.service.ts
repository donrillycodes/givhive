import db from '../config/database';
import { visibleOrganisation } from './safety.service';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import {
  getPaginationParams,
  buildPaginatedResponse,
} from '../utils/pagination';
import { FoodPledgeStatus, FoodNeedStatus, MemberStatus } from '@prisma/client';
import { CreateFoodPledgeInput } from '../types';
import emailService from './email.service';

export class FoodPledgeService {
  // Create a new food pledge
  // Donor commits to bringing a specific quantity of a food item
  async createFoodPledge(input: CreateFoodPledgeInput, donorId: string) {
    // Verify the food need exists and is open
    const foodNeed = await db.foodNeed.findFirst({
      where: { id: input.foodNeedId, isSafetyHidden: false, moderationStatus: 'APPROVED', ngo: visibleOrganisation(donorId) },
      select: {
        id: true,
        title: true,
        ngoId: true,
        status: true,
        quantityRequired: true,
        quantityFulfilled: true,
        unit: true,
        deadline: true,
        ngo: {
          select: {
            id: true,
            name: true,
            status: true,
            isActive: true,
          },
        },
      },
    });

    if (!foodNeed) {
      throw new AppError('Food need not found', 404);
    }

    if (foodNeed.status !== FoodNeedStatus.OPEN) {
      throw new AppError('This food need is no longer accepting pledges', 400);
    }

    if (foodNeed.ngo.status !== 'APPROVED' || !foodNeed.ngo.isActive) {
      throw new AppError('This NGO is not currently active', 400);
    }

    // Check deadline has not passed
    if (foodNeed.deadline && foodNeed.deadline < new Date()) {
      throw new AppError('This food need has passed its deadline', 400);
    }

    // Validate quantity
    if (!Number.isInteger(input.quantityPledged) || input.quantityPledged < 1) {
      throw new AppError(
        'Quantity pledged must be a positive whole number',
        400
      );
    }

    // Check remaining quantity needed
    const remaining = foodNeed.quantityRequired - foodNeed.quantityFulfilled;

    if (input.quantityPledged > remaining) {
      throw new AppError(
        `Only ${remaining} ${foodNeed.unit} still needed for this food need`,
        400
      );
    }

    // Parse and validate drop off date if provided
    let dropOffDate: Date | undefined;
    if (input.dropOffDate) {
      dropOffDate = new Date(input.dropOffDate);
      if (Number.isNaN(dropOffDate.getTime())) {
        throw new AppError('Drop off date must be a valid date string', 400);
      }
      if (dropOffDate < new Date()) {
        throw new AppError('Drop off date must be in the future', 400);
      }
    }

    // Create pledge and increment quantityFulfilled in a single transaction
    // Both operations must succeed together — partial updates are not acceptable
    const [pledge] = await db.$transaction([
      db.foodPledge.create({
        data: {
          donorId,
          foodNeedId: input.foodNeedId,
          ngoId: foodNeed.ngoId,
          quantityPledged: input.quantityPledged,
          status: FoodPledgeStatus.PENDING,
          dropOffDate,
          notes: input.notes,
        },
        select: {
          id: true,
          quantityPledged: true,
          status: true,
          dropOffDate: true,
          notes: true,
          createdAt: true,
          foodNeed: {
            select: {
              id: true,
              title: true,
              itemName: true,
              unit: true,
              ngo: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      db.foodNeed.update({
        where: { id: input.foodNeedId },
        data: {
          quantityFulfilled: {
            increment: input.quantityPledged,
          },
        },
      }),
    ]);

    logger.info(
      `Food pledge created: ${pledge.id} by donor: ${donorId} for food need: ${input.foodNeedId}`
    );

    return pledge;
  }

  // Get a single pledge by ID
  async getFoodPledgeById(pledgeId: string, requesterId: string) {
    const pledge = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        id: true,
        quantityPledged: true,
        status: true,
        dropOffDate: true,
        droppedOffAt: true,
        fulfilledAt: true,
        cancelledAt: true,
        cancellationReason: true,
        notes: true,
        createdAt: true,
        donor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        foodNeed: {
          select: {
            id: true,
            title: true,
            itemName: true,
            unit: true,
          },
        },
        ngo: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        fulfilledBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!pledge) {
      throw new AppError('Pledge not found', 404);
    }

    // Only the donor or an NGO member can view a pledge
    if (pledge.donor.id !== requesterId) {
      // Check if requester is an NGO member
      const membership = await db.nGOMember.findFirst({
        where: {
          userId: requesterId,
          ngoId: pledge.ngo.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (!membership) {
        throw new AppError(
          'You do not have permission to view this pledge',
          403
        );
      }
    }

    return pledge;
  }

  // Confirm a pledge — NGO acknowledges they are expecting the drop off
  async confirmPledge(pledgeId: string, ngoUserId: string) {
    const pledge = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        id: true,
        ngoId: true,
        status: true,
        quantityPledged: true,
      },
    });

    if (!pledge) {
      throw new AppError('Pledge not found', 404);
    }

    // Verify the user belongs to the NGO
    const membership = await db.nGOMember.findFirst({
      where: {
        userId: ngoUserId,
        ngoId: pledge.ngoId,
        status: MemberStatus.ACTIVE,
        canManagePledges: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to manage pledges for this NGO',
        403
      );
    }

    if (pledge.status !== FoodPledgeStatus.PENDING) {
      throw new AppError('Only pending pledges can be confirmed', 400);
    }

    const updated = await db.foodPledge.update({
      where: { id: pledgeId },
      data: { status: FoodPledgeStatus.CONFIRMED },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    // Send pledge confirmed email to donor
    const pledgeDetails = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        quantityPledged: true,
        donor: { select: { email: true, firstName: true, lastName: true } },
        ngo: { select: { name: true } },
        foodNeed: { select: { itemName: true, unit: true } },
      },
    });

    if (pledgeDetails?.donor) {
      await emailService.sendPledgeConfirmed(
        pledgeDetails.donor.email,
        `${pledgeDetails.donor.firstName} ${pledgeDetails.donor.lastName}`,
        pledgeDetails.ngo.name,
        pledgeDetails.foodNeed.itemName,
        pledgeDetails.quantityPledged,
        pledgeDetails.foodNeed.unit
      );
    }

    logger.info(`Pledge confirmed: ${pledgeId} by NGO user: ${ngoUserId}`);

    return updated;
  }

  // Fulfil a pledge — NGO confirms they received the food
  async fulfilPledge(pledgeId: string, ngoUserId: string) {
    const pledge = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        id: true,
        ngoId: true,
        status: true,
        foodNeedId: true,
        quantityPledged: true,
      },
    });

    if (!pledge) {
      throw new AppError('Pledge not found', 404);
    }

    // Verify membership
    const membership = await db.nGOMember.findFirst({
      where: {
        userId: ngoUserId,
        ngoId: pledge.ngoId,
        status: MemberStatus.ACTIVE,
        canManagePledges: true,
      },
    });

    if (!membership) {
      throw new AppError(
        'You do not have permission to manage pledges for this NGO',
        403
      );
    }

    if (
      pledge.status !== FoodPledgeStatus.PENDING &&
      pledge.status !== FoodPledgeStatus.CONFIRMED
    ) {
      throw new AppError(
        'Only pending or confirmed pledges can be fulfilled',
        400
      );
    }

    const now = new Date();

    // Update pledge status and check if food need is now fully fulfilled
    // Both operations in a single transaction
    const [updated, foodNeed] = await db.$transaction([
      db.foodPledge.update({
        where: { id: pledgeId },
        data: {
          status: FoodPledgeStatus.FULFILLED,
          fulfilledAt: now,
          droppedOffAt: now,
          fulfilledById: ngoUserId,
        },
        select: {
          id: true,
          status: true,
          fulfilledAt: true,
          quantityPledged: true,
        },
      }),
      db.foodNeed.findUnique({
        where: { id: pledge.foodNeedId },
        select: {
          id: true,
          quantityRequired: true,
          quantityFulfilled: true,
        },
      }),
    ]);

    // Check if the food need is now completely fulfilled
    if (foodNeed && foodNeed.quantityFulfilled >= foodNeed.quantityRequired) {
      await db.foodNeed.update({
        where: { id: pledge.foodNeedId },
        data: { status: FoodNeedStatus.FULFILLED },
      });

      logger.info(`Food need fully fulfilled: ${pledge.foodNeedId}`);
    }

    // Send pledge fulfilled email to donor
    const pledgeDetails = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        quantityPledged: true,
        donor: { select: { email: true, firstName: true, lastName: true } },
        ngo: { select: { name: true } },
        foodNeed: { select: { itemName: true, unit: true } },
      },
    });

    if (pledgeDetails?.donor) {
      await emailService.sendPledgeFulfilled(
        pledgeDetails.donor.email,
        `${pledgeDetails.donor.firstName} ${pledgeDetails.donor.lastName}`,
        pledgeDetails.ngo.name,
        pledgeDetails.foodNeed.itemName,
        pledgeDetails.quantityPledged,
        pledgeDetails.foodNeed.unit
      );
    }

    logger.info(`Pledge fulfilled: ${pledgeId} by NGO user: ${ngoUserId}`);

    return updated;
  }

  // Cancel a pledge — donor or NGO can cancel
  async cancelPledge(pledgeId: string, requesterId: string, reason: string) {
    const pledge = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        id: true,
        donorId: true,
        ngoId: true,
        status: true,
        foodNeedId: true,
        quantityPledged: true,
      },
    });

    if (!pledge) {
      throw new AppError('Pledge not found', 404);
    }

    // Check requester is the donor or an NGO member
    const isDonor = pledge.donorId === requesterId;

    if (!isDonor) {
      const membership = await db.nGOMember.findFirst({
        where: {
          userId: requesterId,
          ngoId: pledge.ngoId,
          status: MemberStatus.ACTIVE,
          canManagePledges: true,
        },
      });

      if (!membership) {
        throw new AppError(
          'You do not have permission to cancel this pledge',
          403
        );
      }
    }

    if (
      pledge.status === FoodPledgeStatus.FULFILLED ||
      pledge.status === FoodPledgeStatus.CANCELLED ||
      pledge.status === FoodPledgeStatus.EXPIRED
    ) {
      throw new AppError('This pledge cannot be cancelled', 400);
    }

    const now = new Date();

    // Cancel pledge and decrement quantityFulfilled in a single transaction
    const [updated] = await db.$transaction([
      db.foodPledge.update({
        where: { id: pledgeId },
        data: {
          status: FoodPledgeStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: reason,
          cancelledById: requesterId,
        },
        select: {
          id: true,
          status: true,
          cancellationReason: true,
          cancelledAt: true,
        },
      }),
      // Decrement the quantityFulfilled counter
      db.foodNeed.update({
        where: { id: pledge.foodNeedId },
        data: {
          quantityFulfilled: {
            decrement: pledge.quantityPledged,
          },
          // Re-open the food need if it was marked fulfilled
          status: FoodNeedStatus.OPEN,
        },
      }),
    ]);

    logger.info(
      `Pledge cancelled: ${pledgeId} by: ${requesterId} reason: ${reason}`
    );

    return updated;
  }

  // Get all pledges for an NGO — NGO dashboard
  async getNGOPledges(
    ngoId: string,
    page?: string,
    limit?: string,
    status?: string
  ) {
    const params = getPaginationParams(page, limit);

    const where: any = { ngoId };

    if (status) {
      where.status = status as FoodPledgeStatus;
    }

    const [pledges, total] = await Promise.all([
      db.foodPledge.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quantityPledged: true,
          status: true,
          dropOffDate: true,
          fulfilledAt: true,
          cancelledAt: true,
          createdAt: true,
          donor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          foodNeed: {
            select: {
              id: true,
              title: true,
              itemName: true,
              unit: true,
            },
          },
        },
      }),
      db.foodPledge.count({ where }),
    ]);

    return buildPaginatedResponse(pledges, total, params);
  }

  // Get pledges for a specific food need
  async getFoodNeedPledges(foodNeedId: string, page?: string, limit?: string) {
    const params = getPaginationParams(page, limit);

    const [pledges, total] = await Promise.all([
      db.foodPledge.findMany({
        where: { foodNeedId },
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quantityPledged: true,
          status: true,
          dropOffDate: true,
          createdAt: true,
          donor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.foodPledge.count({ where: { foodNeedId } }),
    ]);

    return buildPaginatedResponse(pledges, total, params);
  }

  // Get a pledge for audit log — no permission check
  async getFoodPledgeForAudit(pledgeId: string) {
    const pledge = await db.foodPledge.findUnique({
      where: { id: pledgeId },
      select: {
        id: true,
        status: true,
        quantityPledged: true,
        ngoId: true,
        donorId: true,
      },
    });

    if (!pledge) {
      throw new AppError('Pledge not found', 404);
    }

    return pledge;
  }
}

export default new FoodPledgeService();
