import { Request, Response, NextFunction } from 'express';
import invitationService from '../services/invitation.service';
import { responses } from '../utils/apiResponse';
import { writeAuditLog } from '../middleware/audit';
import { AuditAction, AuditEntityType, InvitationType } from '@prisma/client';

const getParam = (param: unknown): string => {
  if (Array.isArray(param)) return String(param[0]);
  if (typeof param === 'string') return param;
  return '';
};

// Extract the raw Firebase ID token from the Authorization header.
// We do NOT use the `authenticate` middleware on accept because new invitees
// don't have a User row yet — the service provisions it itself.
const extractFirebaseIdToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return token?.trim() || null;
};

export class InvitationController {
  // GET /api/invitations/:token
  // Public — fetch invitation details by token.
  async getByToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token = getParam(req.params.token);
      if (!token) {
        responses.badRequest(res, 'Invitation token is required');
        return;
      }
      const invitation = await invitationService.getByToken(token);
      responses.ok(res, 'Invitation retrieved', { invitation });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/invitations/:token/accept
  // Authenticated via raw Firebase ID token; the email in the token must match
  // the invitation. For brand-new accounts, firstName and lastName are
  // required in the body.
  async accept(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token = getParam(req.params.token);
      if (!token) {
        responses.badRequest(res, 'Invitation token is required');
        return;
      }
      const firebaseIdToken = extractFirebaseIdToken(req);
      if (!firebaseIdToken) {
        responses.unauthorized(
          res,
          'A Firebase ID token is required to accept an invitation.'
        );
        return;
      }
      const { firstName, lastName } = req.body ?? {};

      const result = await invitationService.accept({
        token,
        firebaseIdToken,
        firstName,
        lastName,
      });

      await writeAuditLog(req, {
        action:
          result.type === InvitationType.ADMIN
            ? AuditAction.ADMIN_PERMISSION_CHANGED
            : AuditAction.USER_ROLE_CHANGED,
        entityType:
          result.type === InvitationType.ADMIN
            ? AuditEntityType.ADMIN_MEMBER
            : AuditEntityType.NGO_MEMBER,
        entityId: result.userId,
        newState: { status: 'ACTIVE', acceptedVia: 'invitation' },
        notes: 'Invitation accepted',
      });

      responses.ok(res, 'Invitation accepted', result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/invitations/:token/decline
  // Public — token-only. Declining can't grant anything so it's safe to allow
  // without authentication.
  async decline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token = getParam(req.params.token);
      if (!token) {
        responses.badRequest(res, 'Invitation token is required');
        return;
      }
      await invitationService.decline(token);
      responses.ok(res, 'Invitation declined');
    } catch (error) {
      next(error);
    }
  }
}

export default new InvitationController();
