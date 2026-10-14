import admin from '../config/firebase';
import db from '../config/database';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { RegisterInput } from '../types';
import { Role } from '@prisma/client';
import emailService from './email.service';
import accountDeletionService from './accountDeletion.service';

export class AuthService {
  // Register a new donor account
  // This is the only public registration flow
  // NGO and Admin accounts are created through invitation
  async register(input: RegisterInput) {
    const { email, password, firstName, lastName } = input;

    // Step 1 — Check if email already exists in our database
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    // Step 2 — Create the user in Firebase
    // Firebase handles password hashing and storage
    // We never store or see the actual password
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
    } catch (error: any) {
      // Handle Firebase specific errors
      if (error.code === 'auth/email-already-exists') {
        throw new AppError('An account with this email already exists', 409);
      }
      if (error.code === 'auth/invalid-password') {
        throw new AppError('Password must be at least 6 characters long', 400);
      }
      logger.error('Firebase user creation failed', { error });
      throw new AppError('Failed to create account. Please try again.', 500);
    }

    // Step 3 — Create the user in our own database
    // If this fails we clean up the Firebase user to keep both in sync
    try {
      const user = await db.user.create({
        data: {
          email,
          firstName,
          lastName,
          firebaseUid: firebaseUser.uid,
          role: input.role === 'NGO' ? Role.NGO : Role.DONOR,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info(`New donor registered: ${email}`);
      // Send welcome email
      if (user.role === Role.DONOR) {
        await emailService.sendDonorWelcome(user.email, user.firstName);
      }

      return user;
    } catch (error) {
      // Rollback — delete the Firebase user if database creation fails
      // This prevents orphaned Firebase accounts with no matching database record
      await admin.auth().deleteUser(firebaseUser.uid);
      logger.error(
        'Database user creation failed — Firebase user rolled back',
        {
          error,
        }
      );
      throw new AppError('Failed to create account. Please try again.', 500);
    }
  }

  // Get the currently authenticated user's profile
  async getMe(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        canApproveNgos: true,
        canManageUsers: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManageAdmins: true,
        canManageDonations: true,
        createdAt: true,
        // Include NGO membership if they are an NGO user
        ngoMemberships: {
          where: { status: 'ACTIVE' },
          select: {
            role: true,
            ngo: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  // Sync a user from Firebase to our database
  // Called when a user logs in via social login (Google, Apple)
  // and we need to ensure they exist in our database
  async syncFirebaseUser(firebaseUid: string) {
    // Check if user already exists in our database
    const existingUser = await db.user.findUnique({
      where: { firebaseUid },
    });

    if (existingUser) {
      return existingUser;
    }

    // Get the user's details from Firebase
    const firebaseUser = await admin.auth().getUser(firebaseUid);

    if (!firebaseUser.email) {
      throw new AppError('Firebase user has no email address', 400);
    }

    // Check if email is already taken by another account
    const emailTaken = await db.user.findUnique({
      where: { email: firebaseUser.email },
    });

    if (emailTaken) {
      throw new AppError('An account with this email already exists', 409);
    }

    // Create the user in our database
    const nameParts = (firebaseUser.displayName ?? '').split(' ');
    const firstName = nameParts[0] ?? 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';

    const user = await db.user.create({
      data: {
        email: firebaseUser.email,
        firstName,
        lastName,
        firebaseUid: firebaseUser.uid,
        role: Role.DONOR,
      },
    });

    logger.info(`Social login user synced: ${firebaseUser.email}`);

    return user;
  }

  // Donor self-service deletion includes database erasure and Firebase cleanup.
  async deleteAccount(userId: string, firebaseUid: string, authTime?: number) {
    return accountDeletionService.deleteAccount(userId, firebaseUid, authTime);
  }

}

export default new AuthService();
