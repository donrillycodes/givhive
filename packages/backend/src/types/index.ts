import { Role } from '@prisma/client';

// ── Authenticated request user ─────────────────────────────────────────────────
// Shape of the user object attached to req.user after authentication
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  firebaseUid: string;
  isActive: boolean;
  canApproveNgos: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageAdmins: boolean;
}

// ── Pagination ─────────────────────────────────────────────────────────────────
// Standard pagination parameters for list endpoints
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

// Standard pagination metadata returned with list responses
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ── NGO ────────────────────────────────────────────────────────────────────────
export interface CreateNGOInput {
  name: string;
  email: string;
  phone?: string;
  description: string;
  mission?: string;
  craNumber?: string;
  orgType?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  registrationNumber?: string;
  foodDonationDetails?: string;
  category: string;
  website?: string;
  address: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode: string;
  logoUrl?: string;
  coverUrl?: string;
}

export interface UpdateNGOInput {
  name?: string;
  email?: string;
  phone?: string;
  description?: string;
  mission?: string;
  craNumber?: string;
  orgType?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  registrationNumber?: string;
  foodDonationDetails?: string;
  category?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  logoUrl?: string;
  coverUrl?: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ── Donation ───────────────────────────────────────────────────────────────────
export interface CreateDonationInput {
  ngoId: string;
  amount: number;
  currency?: string;
  message?: string;
  isAnonymous?: boolean;
}

// ── Food Need ──────────────────────────────────────────────────────────────────
export interface CreateFoodNeedInput {
  title: string;
  description?: string;
  itemName: string;
  itemCategory: string;
  unit: string;
  quantityRequired: number;
  deadline?: string;
  dropOffAddress?: string;
  dropOffInstructions?: string;
  isUrgent?: boolean;
}

export interface UpdateFoodNeedInput {
  title?: string;
  description?: string;
  itemName?: string;
  itemCategory?: string;
  unit?: string;
  quantityRequired?: number;
  deadline?: string;
  dropOffAddress?: string;
  dropOffInstructions?: string;
  isUrgent?: boolean;
}

// ── Food Pledge ────────────────────────────────────────────────────────────────
export interface CreateFoodPledgeInput {
  foodNeedId: string;
  quantityPledged: number;
  dropOffDate?: string;
  notes?: string;
}

// ── Update (NGO Post) ──────────────────────────────────────────────────────────
export interface CreateUpdateInput {
  title: string;
  body: string;
  summary?: string;
  type: string;
  isPinned?: boolean;
}

export interface UpdateUpdateInput {
  title?: string;
  body?: string;
  summary?: string;
  type?: string;
  status?: string;
  isPinned?: boolean;
}

// ── Notification ───────────────────────────────────────────────────────────────
export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
  referenceType?: string;
}

// ── Query filters ──────────────────────────────────────────────────────────────
export interface NGOQueryFilters {
  category?: string;
  city?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DonationQueryFilters {
  ngoId?: string;
  donorId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface FoodNeedQueryFilters {
  ngoId?: string;
  category?: string;
  isUrgent?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}
