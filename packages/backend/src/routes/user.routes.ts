import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import {
  requirePermission,
  requireRole,
  superAdminOnly,
} from '../middleware/rbac';
import { Role } from '@prisma/client';
import { profilePhotoLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Authenticated user routes ──────────────────────────────────────────────────

// Get authenticated user's donation history
// GET /api/users/donations
router.get(
  '/donations',
  authenticate,
  userController.getMyDonations.bind(userController)
);

// Get authenticated user's pledge history
// GET /api/users/pledges
router.get(
  '/pledges',
  authenticate,
  userController.getMyPledges.bind(userController)
);

// Update authenticated user's profile
// PATCH /api/users/profile
router.patch(
  '/profile',
  authenticate,
  (req, res, next) => Object.prototype.hasOwnProperty.call(req.body ?? {}, 'photoBase64')
    ? profilePhotoLimiter(req, res, next) : next(),
  userController.updateProfile.bind(userController)
);

// ── Admin routes ───────────────────────────────────────────────────────────────

// Get all users — requires can_manage_users permission
// GET /api/users
router.get(
  '/',
  authenticate,
  requirePermission('canManageUsers'),
  userController.getAllUsers.bind(userController)
);

// Suspend a user — requires can_manage_users permission
// PATCH /api/users/:id/suspend
router.patch(
  '/:id/suspend',
  authenticate,
  requirePermission('canManageUsers'),
  userController.suspendUser.bind(userController)
);

// Reactivate a user — requires can_manage_users permission
// PATCH /api/users/:id/reactivate
router.patch(
  '/:id/reactivate',
  authenticate,
  requirePermission('canManageUsers'),
  userController.reactivateUser.bind(userController)
);

// Change a user's role — SUPER_ADMIN only
// PATCH /api/users/:id/role
router.patch(
  '/:id/role',
  authenticate,
  ...superAdminOnly,
  userController.changeUserRole.bind(userController)
);

// Get a user by ID — admin only
// GET /api/users/:id
router.get(
  '/:id',
  authenticate,
  requirePermission('canManageUsers'),
  userController.getUserById.bind(userController)
);

export default router;
