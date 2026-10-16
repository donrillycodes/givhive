import db from '../config/database';
import admin from '../config/firebase';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { Role } from '@prisma/client';
import { parseProfileUpdate } from '../utils/userProfile';
import profilePhotos from './profilePhoto.service';

export class UserService {
    // Get a user's public profile by ID
    async getUserById(userId: string) {
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
            createdAt: true,
        },
        });

        if (!user) {
        throw new AppError('User not found', 404);
        }

        return user;
    }

    // Update a user's profile
    async updateProfile(
        userId: string,
        data: unknown
    ) {
        const update = parseProfileUpdate(data);
        const { photoBase64, ...names } = update;

        const select = {
            id: true, email: true, firstName: true, lastName: true, role: true,
            avatarUrl: true, isActive: true, createdAt: true, updatedAt: true, firebaseUid: true,
        } as const;
        const savedUser = photoBase64 === undefined ? await db.user.update({
        where: { id: userId },
        data: names, select,
    }) : await db.$transaction(async (tx) => {
        // Serialize photo changes with each other and account deletion.
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        const owner = await tx.user.findUnique({ where: { id: userId }, select: { firebaseUid: true, avatarUrl: true, isActive: true } });
        if (!owner) throw new AppError('User not found', 404);
        if (!owner.isActive) throw new AppError('Your account is not active', 403);
        let avatarUrl: string | null = null;
        if (photoBase64 !== null) {
            avatarUrl = await profilePhotos.upload(owner.firebaseUid, photoBase64);
        } else if (profilePhotos.isConfigured() || profilePhotos.isManagedPhoto(owner.avatarUrl, owner.firebaseUid)) {
            await profilePhotos.remove(profilePhotos.publicId(owner.firebaseUid));
        }
        return tx.user.update({ where: { id: userId }, data: { ...names, avatarUrl }, select });
    }, { timeout: 25000 });

    const { firebaseUid, ...updatedUser } = savedUser;

    // Keep Firebase's display name in sync without exposing its ID to callers.
    if (update.firstName !== undefined || update.lastName !== undefined) {
        try {
            await admin.auth().updateUser(firebaseUid, {
                displayName: `${updatedUser.firstName} ${updatedUser.lastName}`,
            });
        } catch (error) {
            // The database is the app's profile source. Do not report a failed
            // save after the new name has already been persisted there.
            logger.warn('Profile saved; Firebase display-name sync failed', { userId, error });
        }
    }

    logger.info(`Profile updated for user: ${userId}`);

    return updatedUser;
    }

  // Get all users — admin only
    async getAllUsers(
        page?: string,
        limit?: string,
        role?: string,
        search?: string,
        isActive?: string
    ) {
    const params = getPaginationParams(page, limit);

        // Build dynamic filter
        const where: any = {};

        if (role) {
        where.role = role as Role;
        }

        if (isActive !== undefined) {
        where.isActive = isActive === 'true';
        }

        if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
        ];
        }

        const [users, total] = await Promise.all([
        db.user.findMany({
            where,
            skip: params.skip,
            take: params.limit,
            orderBy: { createdAt: 'desc' },
            select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
            },
        }),
        db.user.count({ where }),
        ]);

    return buildPaginatedResponse(users, total, params);
    }

    // Suspend a user account — admin only
    async suspendUser(userId: string, adminId: string) {
        const user = await db.user.findUnique({
        where: { id: userId },
        });

        if (!user) {
        throw new AppError('User not found', 404);
        }

    // Prevent suspending another admin or super admin
        if (
        user.role === Role.ADMIN ||
        user.role === Role.SUPER_ADMIN
        ) {
        throw new AppError(
            'Admin accounts cannot be suspended through this endpoint',
            403
        );
        }

    if (!user.isActive) {
        throw new AppError('User account is already suspended', 409);
        }

        // Suspend in our database
        const updatedUser = await db.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
        },
        });

        // Revoke all Firebase sessions immediately
        // This logs them out of all devices instantly
        await admin.auth().revokeRefreshTokens(user.firebaseUid);

        logger.info(`User suspended: ${userId} by admin: ${adminId}`);

        return updatedUser;
    }

    // Reactivate a suspended user account — admin only
    async reactivateUser(userId: string, adminId: string) {
        const user = await db.user.findUnique({
        where: { id: userId },
        });

        if (!user) {
        throw new AppError('User not found', 404);
        }

    if (user.isActive) {
        throw new AppError('User account is already active', 409);
        }

        const updatedUser = await db.user.update({
        where: { id: userId },
        data: { isActive: true },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
        },
        });

    logger.info(`User reactivated: ${userId} by admin: ${adminId}`);

    return updatedUser;
    }

    // Change a user's role — SUPER_ADMIN only
    async changeUserRole(
        userId: string,
        newRole: Role,
        superAdminId: string
    ) {
        const user = await db.user.findUnique({
        where: { id: userId },
        });

        if (!user) {
        throw new AppError('User not found', 404);
        }

    // Prevent changing your own role
    if (userId === superAdminId) {
        throw new AppError('You cannot change your own role', 403);
        }

        // Prevent demoting another SUPER_ADMIN
        if (user.role === Role.SUPER_ADMIN) {
        throw new AppError('Super admin roles cannot be changed', 403);
        }

        const previousRole = user.role;

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: { role: newRole },
            select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
        });

        logger.info(
        `User role changed: ${userId} from ${previousRole} to ${newRole} by ${superAdminId}`
        );

        return { updatedUser, previousRole };
    }

    // Get a user's donation history
    async getUserDonations(
        userId: string,
        page?: string,
        limit?: string
    ) {
        const params = getPaginationParams(page, limit);

        const [donations, total] = await Promise.all([
        db.donation.findMany({
            where: { donorId: userId },
            skip: params.skip,
            take: params.limit,
            orderBy: { createdAt: 'desc' },
            select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            type: true,
            isAnonymous: true,
            message: true,
            createdAt: true,
            ngo: {
            select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                },
            },
            },
        }),
        db.donation.count({ where: { donorId: userId } }),
    ]);

    return buildPaginatedResponse(donations, total, params);
    }

    // Get a user's food pledge history
    async getUserPledges(
        userId: string,
        page?: string,
        limit?: string
    ) {
        const params = getPaginationParams(page, limit);

        const [pledges, total] = await Promise.all([
        db.foodPledge.findMany({
            where: { donorId: userId },
            skip: params.skip,
            take: params.limit,
            orderBy: { createdAt: 'desc' },
            select: {
            id: true,
            quantityPledged: true,
            status: true,
            dropOffDate: true,
            droppedOffAt: true,
            fulfilledAt: true,
            notes: true,
            createdAt: true,
            foodNeed: {
                select: {
                id: true,
                title: true,
                itemName: true,
                unit: true,
                ngo: {
                    select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    },
                },
                },
            },
            },
        }),
        db.foodPledge.count({ where: { donorId: userId } }),
        ]);

        return buildPaginatedResponse(pledges, total, params);
    }
}

export default new UserService();
