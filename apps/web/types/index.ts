// ── User ───────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "DONOR" | "NGO" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl?: string;
  isActive: boolean;
  canApproveNgos: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageAdmins: boolean;
  canManageDonations: boolean;
  createdAt: string;
}

// ── NGO ────────────────────────────────────────────────────────────────────────
export type NGOStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "RESUBMITTED";

export type NGOCategory =
  | "FOOD_BANK"
  | "HEALTHCARE"
  | "EDUCATION"
  | "SHELTER"
  | "COMMUNITY";

export interface NGO {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  description: string;
  mission?: string;
  craNumber?: string | null;
  orgType?: string | null;
  primaryContactName?: string | null;
  primaryContactTitle?: string | null;
  registrationNumber?: string | null;
  foodDonationDetails?: string | null;
  reviews?: NGOReview[];
  category: NGOCategory;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  status: NGOStatus;
  rejectionReason?: string;
  resubmissionCount: number;
  lastSubmittedAt?: string;
  verifiedAt?: string;
  stripeAccountId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager?: Pick<User, "id" | "email" | "firstName" | "lastName">;
}

export interface NGOReview {
  id: string;
  organisationChecked: boolean;
  representativeConfirmed: boolean;
  foodOperationsConfirmed: boolean;
  evidenceSources: string;
  contactMethod: string;
  contactedAt: string;
  notes: string;
  applicationSnapshot: Record<string, string | null>;
  createdAt: string;
  reviewer: Pick<User, "firstName" | "lastName">;
}

export interface NGOReviewInput {
  organisationChecked: boolean;
  representativeConfirmed: boolean;
  foodOperationsConfirmed: boolean;
  evidenceSources: string;
  contactMethod: string;
  contactedAt: string;
  notes: string;
  applicationUpdatedAt: string;
}

export interface NGODashboard {
  ngo: NGO;
  stats: {
    totalDonationsAmount: number;
    totalDonationsCount: number;
    activePledges: number;
    openNeeds: number;
    totalMembers: number;
  };
}

export interface NGOMember {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  status: "PENDING" | "ACTIVE" | "REMOVED";
  canPostNeeds: boolean;
  canPostUpdates: boolean;
  canManagePledges: boolean;
  canViewDonations: boolean;
  canManageMembers: boolean;
  joinedAt?: string;
  user: Pick<User, "id" | "email" | "firstName" | "lastName" | "avatarUrl">;
}

// ── Food Need ──────────────────────────────────────────────────────────────────
export type FoodNeedStatus = "OPEN" | "FULFILLED" | "CLOSED" | "EXPIRED";

export type FoodItemCategory =
  | "CANNED_GOODS"
  | "GRAINS"
  | "PASTA"
  | "CONDIMENTS"
  | "BEVERAGES"
  | "OTHER";

export interface FoodNeed {
  id: string;
  title: string;
  description?: string;
  itemName: string;
  itemCategory: FoodItemCategory;
  unit: string;
  quantityRequired: number;
  quantityFulfilled: number;
  status: FoodNeedStatus;
  isUrgent: boolean;
  dropOffAddress?: string;
  dropOffInstructions?: string;
  deadline?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  ngo: Pick<NGO, "id" | "name" | "slug">;
  postedBy: Pick<User, "id" | "firstName" | "lastName">;
  _count?: { pledges: number };
}

// ── Food Pledge ────────────────────────────────────────────────────────────────
export type FoodPledgeStatus =
  | "PENDING"
  | "CONFIRMED"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface FoodPledge {
  id: string;
  quantityPledged: number;
  status: FoodPledgeStatus;
  dropOffDate?: string;
  droppedOffAt?: string;
  fulfilledAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  donor: Pick<User, "id" | "firstName" | "lastName" | "avatarUrl">;
  foodNeed: Pick<FoodNeed, "id" | "title" | "itemName" | "unit">;
}

// ── Update ─────────────────────────────────────────────────────────────────────
export type UpdateType =
  | "IMPACT_STORY"
  | "CAMPAIGN_UPDATE"
  | "ANNOUNCEMENT"
  | "THANK_YOU";

export type UpdateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface NGOUpdate {
  id: string;
  title: string;
  body: string;
  summary?: string;
  type: UpdateType;
  status: UpdateStatus;
  isPinned: boolean;
  isFlagged: boolean;
  flaggedReason?: string;
  coverImageUrl?: string;
  viewsCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  ngo: Pick<NGO, "id" | "name" | "slug" | "logoUrl">;
  postedBy: Pick<User, "id" | "firstName" | "lastName">;
}

// ── Donation ───────────────────────────────────────────────────────────────────
export type DonationStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "DISPUTED";

export interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: DonationStatus;
  isAnonymous: boolean;
  message?: string;
  createdAt: string;
  donor?: Pick<User, "id" | "firstName" | "lastName" | "avatarUrl">;
  ngo: Pick<NGO, "id" | "name" | "slug" | "logoUrl">;
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export interface PlatformAnalytics {
  donors: {
    total: number;
    newLast7Days: number;
    newLast30Days: number;
  };
  ngos: {
    total: number;
    approved: number;
    pendingReview: number;
  };
  donations: {
    totalAmount: number;
    totalCount: number;
    last30DaysAmount: number;
    last30DaysCount: number;
  };
  pledges: {
    total: number;
    fulfilled: number;
    fulfilmentRate: string;
  };
  content: {
    publishedUpdates: number;
  };
}

// ── Audit Log ──────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  action: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  notes?: string;
  createdAt: string;
  actor?: Pick<User, "id" | "email" | "firstName" | "lastName" | "role">;
}

// ── Pagination ─────────────────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ── API Response ───────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
