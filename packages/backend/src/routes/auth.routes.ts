import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate, authenticateForAccountDeletion } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────────
// These routes do not require authentication

// Register a new donor account
// POST /api/auth/register
router.post(
    '/register',
    authLimiter,
    authController.register.bind(authController)
);

// ── Protected routes ───────────────────────────────────────────────────────────
// These routes require a valid Firebase token

// Get the currently authenticated user's profile
// GET /api/auth/me
router.get(
    '/me',
    authenticate,
    authController.getMe.bind(authController)
);

// Sync a social login user to our database
// POST /api/auth/sync
router.post(
    '/sync',
    authenticate,
    authController.syncUser.bind(authController)
);

// Delete the authenticated user's account
// DELETE /api/auth/account
router.delete(
    '/account',
    authenticateForAccountDeletion,
    authController.deleteAccount.bind(authController)
);

export default router;