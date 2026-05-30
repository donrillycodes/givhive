import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission, superAdminOnly } from '../middleware/rbac';

const router = Router();

// ── Analytics ──────────────────────────────────────────────────────────────────

// Get platform-wide analytics
// GET /api/admin/analytics
router.get(
  '/analytics',
  authenticate,
  requirePermission('canViewAnalytics'),
  adminController.getPlatformAnalytics.bind(adminController)
);

// ── Audit Log ──────────────────────────────────────────────────────────────────

// Get audit logs — SUPER_ADMIN only
// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  authenticate,
  ...superAdminOnly,
  adminController.getAuditLogs.bind(adminController)
);

// ── Invite acceptance — any authenticated user (invitee is not yet an admin) ──

// Get my pending invite
// GET /api/admin/my-invite
router.get(
  '/my-invite',
  authenticate,
  adminController.getMyInvite.bind(adminController)
);

// Accept my pending invite
// POST /api/admin/my-invite/accept
router.post(
  '/my-invite/accept',
  authenticate,
  adminController.acceptInvite.bind(adminController)
);

// Decline my pending invite
// POST /api/admin/my-invite/decline
router.post(
  '/my-invite/decline',
  authenticate,
  adminController.declineInvite.bind(adminController)
);

// ── Admin team management — SUPER_ADMIN only ───────────────────────────────────

// Get all admin team members
// GET /api/admin/team
router.get(
  '/team',
  authenticate,
  ...superAdminOnly,
  adminController.getAdminTeam.bind(adminController)
);

// Invite a new admin
// POST /api/admin/team/invite
router.post(
  '/team/invite',
  authenticate,
  ...superAdminOnly,
  adminController.inviteAdmin.bind(adminController)
);

// Update admin permissions
// PATCH /api/admin/team/:id/permissions
router.patch(
  '/team/:id/permissions',
  authenticate,
  ...superAdminOnly,
  adminController.updateAdminPermissions.bind(adminController)
);

// Remove an admin
// DELETE /api/admin/team/:id
router.delete(
  '/team/:id',
  authenticate,
  ...superAdminOnly,
  adminController.removeAdmin.bind(adminController)
);

export default router;
