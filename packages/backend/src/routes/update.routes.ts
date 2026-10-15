import { Router } from 'express';
import updateController from '../controllers/update.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────────

// Get all published updates — donor home feed
// GET /api/updates
router.get('/', optionalAuthenticate, updateController.getPublishedUpdates.bind(updateController));

// Get a single update by ID
// GET /api/updates/:id
router.get('/:id', optionalAuthenticate, updateController.getUpdateById.bind(updateController));

// ── NGO routes ─────────────────────────────────────────────────────────────────

// Create a new update — saved as draft
// POST /api/updates
router.post(
  '/',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  updateController.createUpdate.bind(updateController)
);

// Edit a draft update
// PATCH /api/updates/:id
router.patch(
  '/:id',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  updateController.updateContent.bind(updateController)
);

// Publish a draft update
// PATCH /api/updates/:id/publish
router.patch(
  '/:id/publish',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  updateController.publishUpdate.bind(updateController)
);

// Archive an update
// PATCH /api/updates/:id/archive
router.patch(
  '/:id/archive',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  updateController.archiveUpdate.bind(updateController)
);

// Get all updates for an NGO — NGO dashboard
// GET /api/updates/ngo/:ngoId
router.get(
  '/ngo/:ngoId',
  authenticate,
  requireRole(Role.NGO, Role.ADMIN, Role.SUPER_ADMIN),
  updateController.getNGOUpdates.bind(updateController)
);

// ── Admin routes ───────────────────────────────────────────────────────────────

// Flag an update — removes from donor feed
// PATCH /api/updates/:id/flag
router.patch(
  '/:id/flag',
  authenticate,
  requirePermission('canManageContent'),
  updateController.flagUpdate.bind(updateController)
);

// Get all updates across platform
// GET /api/updates/admin/all
router.get(
  '/admin/all',
  authenticate,
  requirePermission('canManageContent'),
  updateController.adminGetAllUpdates.bind(updateController)
);

export default router;
