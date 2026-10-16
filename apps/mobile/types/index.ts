// ── User ───────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "DONOR" | "NGO" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl?: string | null;
  isActive: boolean;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  ngo: Pick<NGO, "id" | "name" | "slug" | "logoUrl" | "city">;
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
  ngo: Pick<NGO, "id" | "name" | "slug" | "logoUrl">;
  foodNeed: Pick<FoodNeed, "id" | "title" | "itemName" | "unit">;
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
  ngo: Pick<NGO, "id" | "name" | "slug" | "logoUrl">;
}

// ── Update ─────────────────────────────────────────────────────────────────────
export type UpdateType =
  | "IMPACT_STORY"
  | "CAMPAIGN_UPDATE"
  | "ANNOUNCEMENT"
  | "THANK_YOU";

export interface NGOUpdate {
  id: string;
  title: string;
  body: string;
  summary?: string;
  type: UpdateType;
  isPinned: boolean;
  coverImageUrl?: string;
  viewsCount: number;
  publishedAt?: string;
  createdAt: string;
  ngo: Pick<NGO, "id" | "name" | "slug" | "logoUrl">;
}

// ── Notification ───────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  status: "UNREAD" | "READ" | "ARCHIVED";
  createdAt: string;
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
