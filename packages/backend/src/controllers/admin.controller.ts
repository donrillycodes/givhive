import { Request, Response, NextFunction } from 'express';
import adminService from '../services/admin.service';
import { responses } from '../utils/apiResponse';
import { writeAuditLog } from '../middleware/audit';
import { AuditAction, AuditEntityType, AdminDepartment } from '@prisma/client';
import invitationService from '../services/invitation.service';

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

export class AdminController {
  // GET /api/admin/analytics
  async getPlatformAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const analytics = await adminService.getPlatformAnalytics();
      responses.ok(res, 'Platform analytics retrieved successfully', analytics);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/audit-logs
  async getAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await adminService.getAuditLogs(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.action),
        getQuery(req.query.entityType),
        getQuery(req.query.actorId)
      );

      responses.ok(res, 'Audit logs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/team
  async getAdminTeam(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const members = await adminService.getAdminTeam();
      responses.ok(res, 'Admin team retrieved successfully', { members });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/team/invite
  async inviteAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const { email, department, permissions } = req.body;

      if (!email) {
        responses.badRequest(res, 'Email address is required');
        return;
      }

      if (!department || !Object.values(AdminDepartment).includes(department)) {
        responses.badRequest(
          res,
          `Invalid department. Must be one of: ${Object.values(AdminDepartment).join(', ')}`
        );
        return;
      }

      const invitation = await invitationService.createAdminInvitation({
        email,
        department: department as AdminDepartment,
        permissions: permissions ?? {},
        invitedById: req.user.id,
      });

      await writeAuditLog(req, {
        action: AuditAction.ADMIN_PERMISSION_CHANGED,
        entityType: AuditEntityType.ADMIN_MEMBER,
        entityId: invitation.id,
        newState: {
          email,
          department,
          permissions: permissions ?? {},
          invitationId: invitation.id,
        },
        notes: 'Admin invitation created (token-based)',
      });

      responses.created(res, 'Admin invitation sent', { invitation });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/team/:id/permissions
  async updateAdminPermissions(
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
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        responses.badRequest(res, 'Permissions object is required');
        return;
      }

      const previousUser = await adminService.getAdminTeam();
      const previousAdmin = previousUser.find((m) => m.user.id === id);

      const updatedUser = await adminService.updateAdminPermissions(
        id,
        permissions,
        req.user.id
      );

      await writeAuditLog(req, {
        action: AuditAction.ADMIN_PERMISSION_CHANGED,
        entityType: AuditEntityType.ADMIN_MEMBER,
        entityId: id,
        previousState: previousAdmin
          ? {
              canApproveNgos: previousAdmin.canApproveNgos,
              canManageUsers: previousAdmin.canManageUsers,
              canManageContent: previousAdmin.canManageContent,
              canViewAnalytics: previousAdmin.canViewAnalytics,
              canManageDonations: previousAdmin.canManageDonations,
            }
          : undefined,
        newState: permissions,
        notes: req.body.notes,
      });

      responses.ok(res, 'Admin permissions updated successfully', {
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/admin/team/:id
  async removeAdmin(
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

      await adminService.removeAdmin(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.ADMIN_PERMISSION_CHANGED,
        entityType: AuditEntityType.ADMIN_MEMBER,
        entityId: id,
        newState: { status: 'REMOVED', role: 'DONOR' },
        notes: 'Admin removed and downgraded to DONOR',
      });

      responses.ok(res, 'Admin removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
