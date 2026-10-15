import { Request, Response, NextFunction } from 'express';
import foodNeedService from '../services/foodNeed.service';
import { responses } from '../utils/apiResponse';
import { writeAuditLog } from '../middleware/audit';
import { AuditAction, AuditEntityType } from '@prisma/client';

const getParam = (param: unknown): string => {
  if (Array.isArray(param)) return String(param[0]);
  if (typeof param === 'string') return param;
  return '';
};

const getQuery = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === 'string') return value;
  return undefined;
};

export class FoodNeedController {
  // POST /api/food-needs
  async createFoodNeed(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const {
        title,
        description,
        itemName,
        itemCategory,
        unit,
        quantityRequired,
        deadline,
        dropOffAddress,
        dropOffInstructions,
        isUrgent,
      } = req.body;

      if (
        !title ||
        !itemName ||
        !itemCategory ||
        !unit ||
        quantityRequired === undefined ||
        quantityRequired === null
      ) {
        responses.badRequest(
          res,
          'Title, itemName, itemCategory, unit, and quantityRequired are required'
        );
        return;
      }

      const foodNeed = await foodNeedService.createFoodNeed(
        {
          title,
          description,
          itemName,
          itemCategory,
          unit,
          quantityRequired: Number(quantityRequired),
          deadline,
          dropOffAddress,
          dropOffInstructions,
          isUrgent,
        },
        req.user.id
      );

      await writeAuditLog(req, {
        action: AuditAction.FOOD_NEED_POSTED,
        entityType: AuditEntityType.FOOD_NEED,
        entityId: foodNeed.id,
        newState: {
          title: foodNeed.title,
          itemName: foodNeed.itemName,
          itemCategory: foodNeed.itemCategory,
          quantityRequired: foodNeed.quantityRequired,
          isUrgent: foodNeed.isUrgent,
          ngoId: foodNeed.ngo.id,
        },
      });

      responses.created(res, 'Food need posted successfully', { foodNeed });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/food-needs/:id
  async getFoodNeedById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const foodNeed = await foodNeedService.getFoodNeedById(id, req.user?.id);
      responses.ok(res, 'Food need retrieved successfully', { foodNeed });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/food-needs
  async getAllFoodNeeds(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await foodNeedService.getAllFoodNeeds(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.category),
        getQuery(req.query.ngoId),
        getQuery(req.query.isUrgent),
        getQuery(req.query.search),
        req.user?.id
      );

      responses.ok(res, 'Food needs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/food-needs/:id
  async updateFoodNeed(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const id = getParam(req.params.id);

      if (Object.keys(req.body).length === 0) {
        responses.badRequest(
          res,
          'At least one field must be provided to update'
        );
        return;
      }

      const foodNeed = await foodNeedService.updateFoodNeed(
        id,
        req.body,
        req.user.id
      );

      responses.ok(res, 'Food need updated successfully', { foodNeed });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/food-needs/:id/close
  async closeFoodNeed(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const id = getParam(req.params.id);
      const previousNeed = await foodNeedService.getFoodNeedForAdmin(id);
      const foodNeed = await foodNeedService.closeFoodNeed(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.FOOD_NEED_CLOSED,
        entityType: AuditEntityType.FOOD_NEED,
        entityId: id,
        previousState: { status: previousNeed.status },
        newState: { status: foodNeed.status },
        notes: req.body.notes,
      });

      responses.ok(res, 'Food need closed successfully', { foodNeed });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/food-needs/ngo/:ngoId
  async getNGOFoodNeeds(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ngoId = getParam(req.params.ngoId);

      const result = await foodNeedService.getNGOFoodNeeds(
        ngoId,
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.status)
      );

      responses.ok(res, 'NGO food needs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/food-needs/admin/all
  async adminGetAllFoodNeeds(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await foodNeedService.adminGetAllFoodNeeds(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.status),
        getQuery(req.query.ngoId)
      );

      responses.ok(res, 'Food needs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default new FoodNeedController();
