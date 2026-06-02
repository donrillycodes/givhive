import crypto from 'crypto';
import admin from '../config/firebase';
import db from '../config/database';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import emailService from './email.service';
import {
  AdminDepartment,
  InvitationStatus,
  InvitationType,
  MemberStatus,
  NGOMemberRole,
  Prisma,
  Role,
} from '@prisma/client';

// ── Permission shapes ─────────────────────────────────────────────────────────

export interface AdminPermissionSet {
  canApproveNgos: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageDonations: boolean;
}

export interface NGOPermissionSet {
  canPostNeeds: boolean;
  canPostUpdates: boolean;
  canManagePledges: boolean;
  canViewDonations: boolean;
  canManageMembers: boolean;
}

// Defaults for NGO member permissions by role.
// OWNER is intentionally excluded — the owner is the person who registered
// the NGO and is never invited. Only MANAGER and STAFF are invitable.
// Source: invitation-system-design.md §5.
const NGO_PERMISSION_DEFAULTS: Record<
  Exclude<NGOMemberRole, 'OWNER'>,
  NGOPermissionSet
> = {
  MANAGER: {
    canPostNeeds: true,
    canPostUpdates: true,
    canManagePledges: true,
    canViewDonations: true,
    canManageMembers: false, // only the owner manages the team
  },
  STAFF: {
    canPostNeeds: true,
    canPostUpdates: true,
    canManagePledges: true,
    canViewDonations: false,
    canManageMembers: false,
  },
};

const TOKEN_BYTES = 32;
const EXPIRY_DAYS = 7;

const generateToken = (): string =>
  crypto.randomBytes(TOKEN_BYTES).toString('hex');

const expiryDate = (): Date =>
  new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

const normaliseEmail = (email: string): string => email.toLowerCase().trim();

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface CreateAdminInvitationInput {
  email: string;
  department: AdminDepartment;
  permissions?: Partial<AdminPermissionSet>;
  invitedById: string;
}

export interface CreateNGOInvitationInput {
  email: string;
  ngoId: string;
  memberRole: NGOMemberRole;
  permissions?: Partial<NGOPermissionSet>;
  invitedById: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class InvitationService {
  // Create an ADMIN invitation. Caller is authorised at the controller layer.
  async createAdminInvitation(input: CreateAdminInvitationInput) {
    const email = normaliseEmail(input.email);

    // Reject if the email is already an active super-admin or admin
    const existingUser = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        adminMembership: { select: { status: true } },
      },
    });

    if (existingUser?.role === Role.SUPER_ADMIN) {
      throw new AppError('This user is already a super admin.', 409);
    }
    if (
      existingUser?.adminMembership &&
      existingUser.adminMembership.status === MemberStatus.ACTIVE
    ) {
      throw new AppError('This user is already an admin team member.', 409);
    }

    // Reject if a PENDING admin invite already exists for this email
    const pending = await db.invitation.findFirst({
      where: {
        email,
        type: InvitationType.ADMIN,
        status: InvitationStatus.PENDING,
      },
      select: { id: true },
    });
    if (pending) {
      throw new AppError(
        'A pending admin invitation already exists for this email. Resend or revoke it before creating a new one.',
        409
      );
    }

    const permissions: AdminPermissionSet = {
      canApproveNgos: input.permissions?.canApproveNgos ?? false,
      canManageUsers: input.permissions?.canManageUsers ?? false,
      canManageContent: input.permissions?.canManageContent ?? false,
      canViewAnalytics: input.permissions?.canViewAnalytics ?? false,
      canManageDonations: input.permissions?.canManageDonations ?? false,
    };

    const invitation = await db.invitation.create({
      data: {
        email,
        token: generateToken(),
        type: InvitationType.ADMIN,
        department: input.department,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        invitedById: input.invitedById,
        expiresAt: expiryDate(),
      },
      select: this.publicSelect(),
    });

    const inviter = await db.user.findUnique({
      where: { id: input.invitedById },
      select: { firstName: true, lastName: true },
    });

    await emailService.sendAdminInvite(
      email,
      inviter ? `${inviter.firstName} ${inviter.lastName}` : 'GivHive Admin',
      invitation.token
    );

    logger.info(
      `Admin invitation created: ${email} by user: ${input.invitedById}`
    );

    return invitation;
  }

  // Create an NGO_MEMBER invitation.
  async createNGOInvitation(input: CreateNGOInvitationInput) {
    const email = normaliseEmail(input.email);

    // Validate NGO exists and is approved
    const ngo = await db.nGO.findUnique({
      where: { id: input.ngoId },
      select: { id: true, name: true, status: true },
    });
    if (!ngo) {
      throw new AppError('NGO not found.', 404);
    }

    // Reject if the email is already an active member of this NGO
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMember = await db.nGOMember.findUnique({
        where: { ngoId_userId: { ngoId: ngo.id, userId: existingUser.id } },
        select: { status: true },
      });
      if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
        throw new AppError(
          'This user is already an active member of your NGO.',
          409
        );
      }
    }

    // Reject if a PENDING invite already exists for this email + ngo
    const pending = await db.invitation.findFirst({
      where: {
        email,
        ngoId: ngo.id,
        type: InvitationType.NGO_MEMBER,
        status: InvitationStatus.PENDING,
      },
      select: { id: true },
    });
    if (pending) {
      throw new AppError(
        'A pending invitation for this email already exists for your NGO. Resend or revoke it before creating a new one.',
        409
      );
    }

    if (input.memberRole === 'OWNER') {
      throw new AppError(
        'You cannot invite someone as an Owner. Choose Manager or Staff.',
        400
      );
    }
    const defaults = NGO_PERMISSION_DEFAULTS[input.memberRole];

    const permissions: NGOPermissionSet = {
      canPostNeeds: input.permissions?.canPostNeeds ?? defaults.canPostNeeds,
      canPostUpdates:
        input.permissions?.canPostUpdates ?? defaults.canPostUpdates,
      canManagePledges:
        input.permissions?.canManagePledges ?? defaults.canManagePledges,
      canViewDonations:
        input.permissions?.canViewDonations ?? defaults.canViewDonations,
      canManageMembers:
        input.permissions?.canManageMembers ?? defaults.canManageMembers,
    };

    const invitation = await db.invitation.create({
      data: {
        email,
        token: generateToken(),
        type: InvitationType.NGO_MEMBER,
        ngoId: ngo.id,
        memberRole: input.memberRole,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        invitedById: input.invitedById,
        expiresAt: expiryDate(),
      },
      select: this.publicSelect(),
    });

    const inviter = await db.user.findUnique({
      where: { id: input.invitedById },
      select: { firstName: true, lastName: true },
    });

    await emailService.sendNGOMemberInvite(
      email,
      ngo.name,
      inviter ? `${inviter.firstName} ${inviter.lastName}` : 'GivHive',
      invitation.token
    );

    logger.info(
      `NGO invitation created: ${email} to NGO: ${ngo.id} by user: ${input.invitedById}`
    );

    return invitation;
  }

  // Public — fetch an invitation by token. Marks the invite EXPIRED if needed.
  // Returns invite details plus accountExists for the email.
  async getByToken(token: string) {
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        ngo: { select: { id: true, name: true, slug: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invitation) {
      throw new AppError('Invitation not found.', 404);
    }

    // Lazy expiry — if past expiresAt and still PENDING, flip to EXPIRED
    if (
      invitation.status === InvitationStatus.PENDING &&
      invitation.expiresAt < new Date()
    ) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      invitation.status = InvitationStatus.EXPIRED;
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      throw new AppError(
        'This invitation has expired. Ask the person who invited you to send a new one.',
        410
      );
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new AppError('This invitation has already been accepted.', 410);
    }
    if (invitation.status === InvitationStatus.DECLINED) {
      throw new AppError('This invitation was declined.', 410);
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      throw new AppError('This invitation has been revoked.', 410);
    }

    const account = await db.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return {
      email: invitation.email,
      type: invitation.type,
      department: invitation.department,
      memberRole: invitation.memberRole,
      ngo: invitation.ngo,
      permissions: invitation.permissions,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      accountExists: !!account,
    };
  }

  // Accept — verifies the Firebase ID token directly, provisions the User if
  // new, and applies the role/membership in a SINGLE transaction. The standard
  // `authenticate` middleware can't run here because new accounts have no User
  // row yet.
  async accept(input: {
    token: string;
    firebaseIdToken: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { token, firebaseIdToken } = input;

    // 1. Load & validate the invitation
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: { ngo: { select: { id: true, name: true } } },
    });
    if (!invitation) {
      throw new AppError('Invitation not found.', 404);
    }

    if (
      invitation.status === InvitationStatus.PENDING &&
      invitation.expiresAt < new Date()
    ) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new AppError(
        'This invitation has expired. Ask the person who invited you to send a new one.',
        410
      );
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError(
        `This invitation is no longer pending (status: ${invitation.status.toLowerCase()}).`,
        410
      );
    }

    // 2. Verify the Firebase ID token directly (no auth middleware)
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (err) {
      logger.warn('Invitation accept — invalid Firebase ID token', { err });
      throw new AppError('Invalid authentication token.', 401);
    }

    const tokenEmail = (decoded.email ?? '').toLowerCase();
    if (!tokenEmail) {
      throw new AppError(
        'Your account is missing an email address. Please contact support.',
        400
      );
    }

    // 3. Security gate — token email MUST match the invitation email
    if (tokenEmail !== invitation.email) {
      logger.warn(
        `Invitation accept — email mismatch. invite=${invitation.email} token=${tokenEmail}`
      );
      throw new AppError(
        'This invitation was sent to a different email address. Sign in with the email that received the invitation.',
        403
      );
    }

    // 4. Eligibility pre-check BEFORE provisioning — so a rejected invite
    //    never leaves an orphaned account behind.
    await this.precheckEligibility(invitation.email, invitation.type);

    // 5. Find the existing User, or detect an email/uid mismatch
    let user = await db.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      const byEmail = await db.user.findUnique({
        where: { email: invitation.email },
        select: { id: true, firebaseUid: true },
      });
      if (byEmail && byEmail.firebaseUid !== decoded.uid) {
        throw new AppError(
          'An account with this email already exists. Sign in to that account to accept the invitation.',
          409
        );
      }
    }

    if (user && !user.isActive) {
      throw new AppError(
        'Your account has been suspended. Contact support before accepting invitations.',
        403
      );
    }

    // 6. Provision (if new) + apply, in a SINGLE transaction so a failure in
    //    the apply step can't leave an orphaned User row.
    const isNewUser = !user;
    let firstName = '';
    let lastName = '';
    if (isNewUser) {
      firstName = (input.firstName ?? '').trim();
      lastName = (input.lastName ?? '').trim();
      if (!firstName || !lastName) {
        throw new AppError(
          'First name and last name are required for new accounts.',
          400
        );
      }
    }

    const perms = invitation.permissions as unknown as
      | AdminPermissionSet
      | NGOPermissionSet;

    const userId = await db.$transaction(async (tx) => {
      // Provision the user inside the transaction if brand new
      const u = isNewUser
        ? await tx.user.create({
            data: {
              email: invitation.email,
              firstName,
              lastName,
              firebaseUid: decoded.uid,
              role: Role.DONOR, // bumped just below
              isActive: true,
            },
            select: { id: true },
          })
        : { id: user!.id };

      if (invitation.type === InvitationType.ADMIN) {
        const p = perms as AdminPermissionSet;
        if (!invitation.department) {
          throw new AppError(
            'Invitation is missing department information.',
            500
          );
        }
        await tx.user.update({
          where: { id: u.id },
          data: {
            role: Role.ADMIN,
            canApproveNgos: p.canApproveNgos ?? false,
            canManageUsers: p.canManageUsers ?? false,
            canManageContent: p.canManageContent ?? false,
            canViewAnalytics: p.canViewAnalytics ?? false,
            canManageDonations: p.canManageDonations ?? false,
          },
        });
        await tx.adminMember.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            department: invitation.department,
            status: MemberStatus.ACTIVE,
            invitedById: invitation.invitedById,
            joinedAt: new Date(),
            canApproveNgos: p.canApproveNgos ?? false,
            canManageUsers: p.canManageUsers ?? false,
            canManageContent: p.canManageContent ?? false,
            canViewAnalytics: p.canViewAnalytics ?? false,
            canManageDonations: p.canManageDonations ?? false,
          },
          update: {
            department: invitation.department,
            status: MemberStatus.ACTIVE,
            joinedAt: new Date(),
            canApproveNgos: p.canApproveNgos ?? false,
            canManageUsers: p.canManageUsers ?? false,
            canManageContent: p.canManageContent ?? false,
            canViewAnalytics: p.canViewAnalytics ?? false,
            canManageDonations: p.canManageDonations ?? false,
          },
        });
      } else {
        const p = perms as NGOPermissionSet;
        if (!invitation.ngoId || !invitation.memberRole) {
          throw new AppError('Invitation is missing NGO information.', 500);
        }
        await tx.user.update({
          where: { id: u.id },
          data: { role: Role.NGO },
        });
        await tx.nGOMember.upsert({
          where: { ngoId_userId: { ngoId: invitation.ngoId, userId: u.id } },
          create: {
            ngoId: invitation.ngoId,
            userId: u.id,
            invitedById: invitation.invitedById,
            role: invitation.memberRole,
            status: MemberStatus.ACTIVE,
            joinedAt: new Date(),
            canPostNeeds: p.canPostNeeds ?? false,
            canPostUpdates: p.canPostUpdates ?? false,
            canManagePledges: p.canManagePledges ?? false,
            canViewDonations: p.canViewDonations ?? false,
            canManageMembers: p.canManageMembers ?? false,
          },
          update: {
            role: invitation.memberRole,
            status: MemberStatus.ACTIVE,
            joinedAt: new Date(),
            canPostNeeds: p.canPostNeeds ?? false,
            canPostUpdates: p.canPostUpdates ?? false,
            canManagePledges: p.canManagePledges ?? false,
            canViewDonations: p.canViewDonations ?? false,
            canManageMembers: p.canManageMembers ?? false,
          },
        });
      }

      // Mark the invitation accepted inside the same transaction
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedByUserId: u.id,
        },
      });

      return u.id;
    });

    logger.info(
      `Invitation accepted: id=${invitation.id} user=${userId} type=${invitation.type}`
    );

    return {
      userId,
      type: invitation.type,
      redirectTo: invitation.type === InvitationType.ADMIN ? '/admin' : '/ngo',
    };
  }

  // Validate that an existing user (looked up by email) is eligible for this
  // invitation type BEFORE any account is provisioned. Throws if the user is
  // ineligible — so we never create or promote an account we're about to
  // reject, and never leave an orphaned User row behind.
  private async precheckEligibility(
    email: string,
    type: InvitationType
  ): Promise<void> {
    const existing = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        managedNgo: { select: { id: true } },
        ngoMemberships: {
          where: { status: MemberStatus.ACTIVE },
          select: { id: true },
          take: 1,
        },
        adminMembership: { select: { status: true } },
      },
    });

    if (!existing) return; // brand-new email — nothing to conflict with

    const hasNgoTie =
      !!existing.managedNgo || (existing.ngoMemberships?.length ?? 0) > 0;
    const isActiveAdmin =
      existing.adminMembership?.status === MemberStatus.ACTIVE;

    if (type === InvitationType.ADMIN) {
      if (existing.role === Role.SUPER_ADMIN) {
        throw new AppError('This account is already a super admin.', 409);
      }
      if (hasNgoTie) {
        throw new AppError(
          'This account is already tied to an NGO. Use a different email to accept the admin invitation.',
          409
        );
      }
    } else {
      // NGO_MEMBER — one NGO / one purpose per account
      if (existing.managedNgo) {
        throw new AppError(
          'This account already manages an NGO. Use a different email to join another NGO team.',
          409
        );
      }
      if ((existing.ngoMemberships?.length ?? 0) > 0) {
        throw new AppError(
          'This account is already a member of an NGO. Use a different email to join another NGO team.',
          409
        );
      }
      if (isActiveAdmin) {
        throw new AppError(
          'This account is part of the GivHive admin team. Use a different email to join an NGO.',
          409
        );
      }
    }
  }

  // Public — decline a pending invitation. Token-only (no sign-in required);
  // declining can't grant anything so the risk is low.
  async decline(token: string) {
    const invitation = await db.invitation.findUnique({
      where: { token },
      select: { id: true, status: true, expiresAt: true, email: true },
    });
    if (!invitation) {
      throw new AppError('Invitation not found.', 404);
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError(
        'This invitation is no longer pending and cannot be declined.',
        410
      );
    }
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.DECLINED },
    });
    logger.info(`Invitation declined: ${invitation.id}`);
  }

  // Cron — sweep PENDING invitations past their expiry and mark them EXPIRED.
  async expirePending(): Promise<number> {
    const now = new Date();
    const result = await db.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
    if (result.count > 0) {
      logger.info(`Cron: Expired ${result.count} invitations`);
    }
    return result.count;
  }

  // Field selection used for public-facing invitation responses.
  private publicSelect() {
    return {
      id: true,
      email: true,
      token: true,
      type: true,
      status: true,
      department: true,
      ngoId: true,
      memberRole: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
    } satisfies Prisma.InvitationSelect;
  }
}

export default new InvitationService();
