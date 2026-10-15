import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';
import db from '../config/database';
import { AppError } from './error';
import logger from '../utils/logger';

// Extend Express Request type to include our authenticated user
// This makes req.user available with full type safety throughout the app
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        firebaseUid: string;
        isActive: boolean;
        authTime: number;
        canApproveNgos: boolean;
        canManageUsers: boolean;
        canManageContent: boolean;
        canViewAnalytics: boolean;
        canManageAdmins: boolean;
        canManageDonations: boolean;
      };
    }
  }
}

const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  forAccountDeletion = false
): Promise<void> => {
  try {
    // Step 1 — Extract the token from the Authorization header
    // Mobile app and web dashboard send: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      throw new AppError('Invalid authentication token format', 401);
    }

    // Step 2 — Verify the token with Firebase
    // Firebase checks the token is valid, not expired, and not tampered with
    const decodedToken = await admin.auth().verifyIdToken(token, forAccountDeletion);

    if (!decodedToken) {
      throw new AppError('Invalid authentication token', 401);
    }

    // Step 3 — Find the user in our own database
    // Firebase confirms identity but our database has role and permissions
    const user = await db.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: {
        id: true,
        email: true,
        role: true,
        firebaseUid: true,
        isActive: true,
        canApproveNgos: true,
        canManageUsers: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManageAdmins: true,
        canManageDonations: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found', 401);
    }

    // Step 4 — Check if the account is active
    // Suspended accounts are rejected here before reaching any endpoint
    if (!user.isActive && !forAccountDeletion) {
      throw new AppError(
        'Your account has been suspended. Please contact support.',
        403
      );
    }

    // Step 5 — Attach user to request object
    // Every subsequent middleware and controller can access req.user
    req.user = { ...user, authTime: decodedToken.auth_time };

    logger.debug(`Authenticated user: ${user.email} (${user.role})`);

    next();
  } catch (error) {
    next(error);
  }
};


export const authenticate = (req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req, res, next);

// Deletion also checks Firebase revocation and permits suspended application
// accounts to remove their data instead of treating suspension as a retention rule.
export const authenticateForAccountDeletion = (req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req, res, next, true);

// Public browsing stays available without a token; supplied tokens must be valid.
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization) return next();
  res.set('Cache-Control', 'private, no-store');
  return authenticate(req, res, next);
};
