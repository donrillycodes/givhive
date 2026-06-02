import { Router } from 'express';
import invitationController from '../controllers/invitation.controller';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Public, token-based invitation endpoints ──────────────────────────────────
// These routes intentionally do NOT use the `authenticate` middleware.
// New invitees may not have a User row yet — the accept handler verifies
// the Firebase ID token directly and provisions the user itself.
// authLimiter caps abuse on the public accept/decline endpoints.

// GET /api/invitations/:token — fetch invite details
router.get(
  '/:token',
  invitationController.getByToken.bind(invitationController)
);

// POST /api/invitations/:token/accept — accept the invite
router.post(
  '/:token/accept',
  authLimiter,
  invitationController.accept.bind(invitationController)
);

// POST /api/invitations/:token/decline — decline the invite
router.post(
  '/:token/decline',
  authLimiter,
  invitationController.decline.bind(invitationController)
);

export default router;
