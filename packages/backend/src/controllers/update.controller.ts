import { Request, Response, NextFunction } from 'express';
import updateService from '../services/update.service';
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

export class UpdateController {
  // POST /api/updates
  async createUpdate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const { title, body, summary, type, isPinned } = req.body;

      if (!title || !body || !type) {
        responses.badRequest(res, 'Title, body, and type are required');
        return;
      }

      if (title.trim().length < 5) {
        responses.badRequest(res, 'Title must be at least 5 characters long');
        return;
      }

      if (body.trim().length < 20) {
        responses.badRequest(res, 'Body must be at least 20 characters long');
        return;
      }

      const update = await updateService.createUpdate(
        { title, body, summary, type, isPinned },
        req.user.id
      );

      await writeAuditLog(req, {
        action: AuditAction.UPDATE_PUBLISHED,
        entityType: AuditEntityType.UPDATE,
        entityId: update.id,
        newState: {
          title: update.title,
          type: update.type,
          status: update.status,
          ngoId: update.ngo.id,
        },
        notes: 'Update created as draft',
      });

      responses.created(res, 'Update created successfully', { update });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/updates/:id/publish
  async publishUpdate(
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
      const previous = await updateService.getUpdateForAudit(id);
      const update = await updateService.publishUpdate(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.UPDATE_PUBLISHED,
        entityType: AuditEntityType.UPDATE,
        entityId: id,
        previousState: { status: previous.status },
        newState: { status: update.status },
        notes: 'Update submitted for content review',
      });

      responses.ok(res, 'Update submitted for review. It will appear after moderator approval.', { update });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/updates/:id
  async getUpdateById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const requesterId = req.user?.id;
      const update = await updateService.getUpdateById(id, requesterId);
      responses.ok(res, 'Update retrieved successfully', { update });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/updates
  async getPublishedUpdates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await updateService.getPublishedUpdates(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.type),
        getQuery(req.query.ngoId),
        getQuery(req.query.search),
        req.user?.id
      );

      responses.ok(res, 'Updates retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/updates/:id
  async updateContent(
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

      const update = await updateService.updateContent(
        id,
        req.body,
        req.user.id
      );

      responses.ok(res, 'Update edited successfully', { update });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/updates/:id/archive
  async archiveUpdate(
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
      const previous = await updateService.getUpdateForAudit(id);
      const update = await updateService.archiveUpdate(id, req.user.id);

      await writeAuditLog(req, {
        action: AuditAction.UPDATE_ARCHIVED,
        entityType: AuditEntityType.UPDATE,
        entityId: id,
        previousState: { status: previous.status },
        newState: { status: update.status },
        notes: req.body.notes,
      });

      responses.ok(res, 'Update archived successfully', { update });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/updates/ngo/:ngoId
  async getNGOUpdates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const ngoId = getParam(req.params.ngoId);

      const result = await updateService.getNGOUpdates(
        ngoId,
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.status)
      );

      responses.ok(res, 'NGO updates retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/updates/:id/flag — admin only
  async flagUpdate(
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
          'A flag reason of at least 10 characters is required'
        );
        return;
      }

      const previous = await updateService.getUpdateForAudit(id);
      const update = await updateService.flagUpdate(
        id,
        req.user.id,
        reason.trim()
      );

      await writeAuditLog(req, {
        action: AuditAction.UPDATE_FLAGGED,
        entityType: AuditEntityType.UPDATE,
        entityId: id,
        previousState: {
          status: previous.status,
          isFlagged: previous.isFlagged,
        },
        newState: { status: update.status, isFlagged: update.isFlagged },
        notes: reason,
      });

      responses.ok(res, 'Update flagged successfully', { update });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/updates/admin/all — admin only
  async adminGetAllUpdates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await updateService.adminGetAllUpdates(
        getQuery(req.query.page),
        getQuery(req.query.limit),
        getQuery(req.query.status),
        getQuery(req.query.isFlagged)
      );

      responses.ok(res, 'Updates retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default new UpdateController();
