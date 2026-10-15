import { Router } from 'express';
import foodNeedController from '../controllers/foodNeed.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────────

// Browse all open food needs
// GET /api/food-needs
router.get('/', optionalAuthenticate, foodNeedController.getAllFoodNeeds.bind(foodNeedController));

// Get a single food need by ID
// GET /api/food-needs/:id
router.get('/:id', optionalAuthenticate, foodNeedController.getFoodNeedById.bind(foodNeedController));

// ── NGO routes ─────────────────────────────────────────────────────────────────

// Create a new food need
// POST /api/food-needs
router.post(
  '/',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  foodNeedController.createFoodNeed.bind(foodNeedController)
);

// Update a food need
// PATCH /api/food-needs/:id
router.patch(
  '/:id',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  foodNeedController.updateFoodNeed.bind(foodNeedController)
);

// Close a food need
// PATCH /api/food-needs/:id/close
router.patch(
  '/:id/close',
  authenticate,
  requireRole(Role.NGO, Role.SUPER_ADMIN),
  foodNeedController.closeFoodNeed.bind(foodNeedController)
);

// Get food needs for a specific NGO — NGO dashboard
// GET /api/food-needs/ngo/:ngoId
router.get(
  '/ngo/:ngoId',
  authenticate,
  requireRole(Role.NGO, Role.ADMIN, Role.SUPER_ADMIN),
  foodNeedController.getNGOFoodNeeds.bind(foodNeedController)
);

// ── Admin routes ───────────────────────────────────────────────────────────────

// Get all food needs across platform
// GET /api/food-needs/admin/all
router.get(
  '/admin/all',
  authenticate,
  requirePermission('canManageContent'),
  foodNeedController.adminGetAllFoodNeeds.bind(foodNeedController)
);

export default router;
