import { Request, Response, NextFunction } from 'express';
import ngoService from '../services/ngo.service';
import { responses } from '../utils/apiResponse';
import { writeAuditLog } from '../middleware/audit';
import { AuditAction, AuditEntityType, NGOMemberRole } from '@prisma/client';
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

export class NGOController {
  // POST /api/ngos/register
  async registerNGO(
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
        name,
        email,
        phone,
        description,
        mission,
        category,
        website,
        address,
        city,
        province,
        country,
        postalCode,
      } = req.body;

      // Validate required fields
      if (
        !name ||
        !email ||
        !description ||
        !category ||
        !address ||
        !postalCode
      ) {
        responses.badRequest(
          res,
          'Name, email, description, category, address, and postal code are required'
        );
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        responses.badRequest(res, 'Please provide a valid email address');
        return;
      }

      const ngo = await ngoService.registerNGO(
        {
          name: name.trim(),
          email,
          phone,
          description: description.trim(),
          mission,
          category,
          website,
          address: address.trim(),
          city,
          province,
          country,
          postalCode: postalCode.trim(),
        },
        req.user.id
      );

      await writeAuditLog(req, {
        action: AuditAction.NGO_SUBMITTED,
        entityType: AuditEntityType.NGO,
        entityId: ngo.id,
        newState: { name: ngo.name, status: ngo.status },
        notes: 'NGO registration submitted',
      });

      responses.created(
        res,
        'NGO registration submitted successfully. Your application is under review.',
        { ngo }
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ngos/:identifier
  async getNGO(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = getParam(req.params.identifier);
      const ngo = await ngoService.getNGO(identifier);
      responses.ok(res, 'NGO retrieved successfully', { ngo });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ngos
  async getAllNGOs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await ngoService.getAllNGOs({
        category: getQuery(req.query.category),
        city: getQuery(req.query.city),
        search: getQuery(req.query.search),
        page: req.query.page
          ? parseInt(getQuery(req.query.page) ?? '1')
          : undefined,
        limit: req.query.limit
          ? parseInt(getQuery(req.query.limit) ?? '20')
          : undefined,
      });

      responses.ok(res, 'NGOs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ngos/dashboard
  async getNGODashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      // Find the NGO this user manages
      const ngo = await import('../config/database').then((m) =>
        m.default.nGO.findUnique({
          where: { managerId: req.user!.id },
          select: { id: true },
        })
      );

      if (!ngo) {
        responses.notFound(res, 'You do not manage an NGO');
        return;
      }

      const dashboard = await ngoService.getNGODashboard(ngo.id);
      responses.ok(res, 'NGO dashboard retrieved successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/ngos/:id
  async updateNGO(
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
      const ngo = await ngoService.updateNGO(id, req.body);
      responses.ok(res, 'NGO updated successfully', { ngo });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/ngos/:id/resubmit
  async resubmitNGO(
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
      const ngo = await ngoService.resubmitNGO(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.NGO_RESUBMITTED,
        entityType: AuditEntityType.NGO,
        entityId: id,
        newState: {
          status: ngo.status,
          resubmissionCount: ngo.resubmissionCount,
        },
        notes: 'NGO resubmitted after rejection',
      });

      responses.ok(res, 'NGO resubmitted successfully', { ngo });
    } catch (error) {
      next(error);
    }
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────────

  // GET /api/ngos/admin/all
  async adminGetAllNGOs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await ngoService.adminGetAllNGOs(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.status),
        getQuery(req.query.search)
      );

      responses.ok(res, 'NGOs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/ngos/:id/approve
  async approveNGO(
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
      const previousNgo = await ngoService.getNGOForAdmin(id);
      const ngo = await ngoService.approveNGO(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.NGO_APPROVED,
        entityType: AuditEntityType.NGO,
        entityId: id,
        previousState: { status: previousNgo.status },
        newState: { status: ngo.status },
        notes: req.body?.notes,
      });

      responses.ok(res, 'NGO approved successfully', { ngo });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/ngos/:id/reject
  async rejectNGO(
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
      const { reason } = req.body;

      if (!reason || reason.trim().length < 10) {
        responses.badRequest(
          res,
          'A rejection reason of at least 10 characters is required'
        );
        return;
      }

      const previousNgo = await ngoService.getNGOForAdmin(id);
      const ngo = await ngoService.rejectNGO(id, req.user.id, reason.trim());

      await writeAuditLog(req, {
        action: AuditAction.NGO_REJECTED,
        entityType: AuditEntityType.NGO,
        entityId: id,
        previousState: { status: previousNgo.status },
        newState: { status: ngo.status, rejectionReason: reason },
        notes: reason,
      });

      responses.ok(res, 'NGO rejected successfully', { ngo });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/ngos/:id/suspend
  async suspendNGO(
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
      const { reason } = req.body;

      if (!reason || reason.trim().length < 10) {
        responses.badRequest(
          res,
          'A suspension reason of at least 10 characters is required'
        );
        return;
      }

      const previousNgo = await ngoService.getNGOForAdmin(id);
      const ngo = await ngoService.suspendNGO(id, req.user.id, reason.trim());

      await writeAuditLog(req, {
        action: AuditAction.NGO_SUSPENDED,
        entityType: AuditEntityType.NGO,
        entityId: id,
        previousState: { status: previousNgo.status },
        newState: { status: ngo.status },
        notes: reason,
      });

      responses.ok(res, 'NGO suspended successfully', { ngo });
    } catch (error) {
      next(error);
    }
  }

  // ── Member management endpoints ──────────────────────────────────────────────

  // GET /api/ngos/:id/members
  async getNGOMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const members = await ngoService.getNGOMembers(id);
      responses.ok(res, 'NGO members retrieved successfully', { members });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/ngos/:id/members/invite
  async inviteMember(
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
      const { email, role } = req.body;

      if (!email) {
        responses.badRequest(res, 'Email address is required');
        return;
      }

      // Validate role
      const validRoles = [NGOMemberRole.MANAGER, NGOMemberRole.STAFF];
      if (role && !validRoles.includes(role)) {
        responses.badRequest(
          res,
          `Invalid role. Must be one of: ${validRoles.join(', ')}`
        );
        return;
      }

      const invitation = await invitationService.createNGOInvitation({
        email,
        ngoId: id,
        memberRole: role ?? NGOMemberRole.STAFF,
        invitedById: req.user.id,
      });

      await writeAuditLog(req, {
        action: AuditAction.USER_ROLE_CHANGED,
        entityType: AuditEntityType.NGO_MEMBER,
        entityId: invitation.id,
        newState: { email, role: role ?? NGOMemberRole.STAFF, ngoId: id },
        notes: 'NGO member invitation created (token-based)',
      });

      responses.created(res, 'Invitation sent', { invitation });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/ngos/:id/members/:memberId
  async removeMember(
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
      const memberId = getParam(req.params.memberId);

      await ngoService.removeMember(id, memberId, req.user.id);
      responses.ok(res, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new NGOController();
