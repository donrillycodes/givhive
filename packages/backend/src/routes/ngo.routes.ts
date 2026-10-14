import { Router } from 'express';
import ngoController from '../controllers/ngo.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────────

// Browse all approved NGOs
// GET /api/ngos
router.get('/', ngoController.getAllNGOs.bind(ngoController));

// ── Specific named routes MUST come before /:identifier ────────────────────────

// Get NGO dashboard — NGO managers only
// GET /api/ngos/dashboard
router.get(
  '/dashboard',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  ngoController.getNGODashboard.bind(ngoController)
);

// Get all NGOs with any status — admin only
// GET /api/ngos/admin/all
router.get(
  '/admin/all',
  authenticate,
  requirePermission('canApproveNgos'),
  ngoController.adminGetAllNGOs.bind(ngoController)
);

// Register a new NGO
// POST /api/ngos/register
router.post(
  '/register',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  ngoController.registerNGO.bind(ngoController)
);

// ── Dynamic routes ─────────────────────────────────────────────────────────────

// Get a single NGO by ID or slug — must come AFTER all named routes
// GET /api/ngos/:identifier
router.get('/:identifier', ngoController.getNGO.bind(ngoController));

// Update NGO profile
// PATCH /api/ngos/:id
router.patch(
  '/:id',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  ngoController.updateNGO.bind(ngoController)
);

// Resubmit NGO after rejection
// POST /api/ngos/:id/resubmit
router.post(
  '/:id/resubmit',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  ngoController.resubmitNGO.bind(ngoController)
);

// ── Member management routes ───────────────────────────────────────────────────

// Get NGO members
// GET /api/ngos/:id/members
router.get(
  '/:id/members',
  authenticate,
  requireRole(Role.NGO, Role.ADMIN, Role.SUPER_ADMIN),
  ngoController.getNGOMembers.bind(ngoController)
);

// Invite a member to the NGO
// POST /api/ngos/:id/members/invite
router.post(
  '/:id/members/invite',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  ngoController.inviteMember.bind(ngoController)
);

// Remove a member from the NGO
// DELETE /api/ngos/:id/members/:memberId
router.delete(
  '/:id/members/:memberId',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  ngoController.removeMember.bind(ngoController)
);

// ── Admin routes ───────────────────────────────────────────────────────────────

// Approve an NGO
// PATCH /api/ngos/:id/approve
router.patch(
  '/:id/approve',
  authenticate,
  requirePermission('canApproveNgos'),
  ngoController.approveNGO.bind(ngoController)
);

// Reject an NGO
// PATCH /api/ngos/:id/reject
router.patch(
  '/:id/reject',
  authenticate,
  requirePermission('canApproveNgos'),
  ngoController.rejectNGO.bind(ngoController)
);

// Suspend an approved NGO
// PATCH /api/ngos/:id/suspend
router.patch(
  '/:id/suspend',
  authenticate,
  requirePermission('canApproveNgos'),
  ngoController.suspendNGO.bind(ngoController)
);

export default router;
