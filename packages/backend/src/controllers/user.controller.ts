import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { responses } from '../utils/apiResponse';
import { writeAuditLog } from '../middleware/audit';
import { AuditAction, AuditEntityType, Role } from '@prisma/client';

// Helper to safely extract a string param from req.params
const getParam = (param: unknown): string => {
  if (Array.isArray(param)) return String(param[0]);
  if (typeof param === 'string') return param;
  return '';
};

// Helper to safely extract a string query value
const getQuery = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === 'string') return value;
  return undefined;
};

export class UserController {
  // GET /api/users/:id
  async getUserById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const user = await userService.getUserById(id);
      responses.ok(res, 'User retrieved successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/users/profile
  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const user = await userService.updateProfile(req.user.id, req.body);

      responses.ok(res, 'Profile updated successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users — admin only
  async getAllUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await userService.getAllUsers(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.role),
        getQuery(req.query.search),
        getQuery(req.query.isActive)
      );

      responses.ok(res, 'Users retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/users/:id/suspend — admin only
  async suspendUser(
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

      if (id === req.user.id) {
        responses.badRequest(res, 'You cannot suspend your own account');
        return;
      }

      const previousUser = await userService.getUserById(id);
      const user = await userService.suspendUser(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.USER_SUSPENDED,
        entityType: AuditEntityType.USER,
        entityId: id,
        previousState: { isActive: previousUser.isActive },
        newState: { isActive: false },
        notes: req.body.notes,
      });

      responses.ok(res, 'User suspended successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/users/:id/reactivate — admin only
  async reactivateUser(
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
      const previousUser = await userService.getUserById(id);
      const user = await userService.reactivateUser(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.USER_REACTIVATED,
        entityType: AuditEntityType.USER,
        entityId: id,
        previousState: { isActive: previousUser.isActive },
        newState: { isActive: true },
        notes: req.body.notes,
      });

      responses.ok(res, 'User reactivated successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/users/:id/role — SUPER_ADMIN only
  async changeUserRole(
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
      const { role } = req.body;

      if (!role || !Object.values(Role).includes(role)) {
        responses.badRequest(
          res,
          `Invalid role. Must be one of: ${Object.values(Role).join(', ')}`
        );
        return;
      }

      const { updatedUser, previousRole } = await userService.changeUserRole(
        id,
        role as Role,
        req.user.id
      );

      await writeAuditLog(req, {
        action: AuditAction.USER_ROLE_CHANGED,
        entityType: AuditEntityType.USER,
        entityId: id,
        previousState: { role: previousRole },
        newState: { role },
        notes: req.body.notes,
      });

      responses.ok(res, 'User role updated successfully', {
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users/donations
  async getMyDonations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const result = await userService.getUserDonations(
        req.user.id,
        getQuery(req.query.page),
        getQuery(req.query.limit)
      );

      responses.ok(res, 'Donations retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users/pledges
  async getMyPledges(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const result = await userService.getUserPledges(
        req.user.id,
        getQuery(req.query.page),
        getQuery(req.query.limit)
      );

      responses.ok(res, 'Pledges retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
