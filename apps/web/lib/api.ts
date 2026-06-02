import axios, { type AxiosInstance, type AxiosError } from "axios";
import { getToken } from "./firebase";

// Create the axios instance pointing to our backend API
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor — attaches Firebase JWT token to every request
// This runs automatically before every API call
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handles errors consistently
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  getMe: () => apiClient.get("/api/auth/me"),
  register: (data: any) => apiClient.post("/api/auth/register", data),
};

// ── NGO ────────────────────────────────────────────────────────────────────────
export const ngoApi = {
  register: (data: any) => apiClient.post("/api/ngos/register", data),
  getDashboard: () => apiClient.get("/api/ngos/dashboard"),
  update: (id: string, data: any) => apiClient.patch(`/api/ngos/${id}`, data),
  resubmit: (id: string) => apiClient.post(`/api/ngos/${id}/resubmit`),
  getMembers: (id: string) => apiClient.get(`/api/ngos/${id}/members`),
  inviteMember: (id: string, data: any) =>
    apiClient.post(`/api/ngos/${id}/members/invite`, data),
  removeMember: (id: string, memberId: string) =>
    apiClient.delete(`/api/ngos/${id}/members/${memberId}`),
  // Admin
  adminGetAll: (params?: any) =>
    apiClient.get("/api/ngos/admin/all", { params }),
  approve: (id: string, data?: any) =>
    apiClient.patch(`/api/ngos/${id}/approve`, data),
  reject: (id: string, data: any) =>
    apiClient.patch(`/api/ngos/${id}/reject`, data),
  suspend: (id: string, data: any) =>
    apiClient.patch(`/api/ngos/${id}/suspend`, data),
};

// ── Food Needs ─────────────────────────────────────────────────────────────────
export const foodNeedApi = {
  create: (data: any) => apiClient.post("/api/food-needs", data),
  getByNGO: (ngoId: string, params?: any) =>
    apiClient.get(`/api/food-needs/ngo/${ngoId}`, { params }),
  update: (id: string, data: any) =>
    apiClient.patch(`/api/food-needs/${id}`, data),
  close: (id: string) => apiClient.patch(`/api/food-needs/${id}/close`),
  adminGetAll: (params?: any) =>
    apiClient.get("/api/food-needs/admin/all", { params }),
};

// ── Food Pledges ───────────────────────────────────────────────────────────────
export const foodPledgeApi = {
  getByNGO: (ngoId: string, params?: any) =>
    apiClient.get(`/api/food-pledges/ngo/${ngoId}`, { params }),
  confirm: (id: string) => apiClient.patch(`/api/food-pledges/${id}/confirm`),
  fulfil: (id: string) => apiClient.patch(`/api/food-pledges/${id}/fulfil`),
  cancel: (id: string, data: any) =>
    apiClient.patch(`/api/food-pledges/${id}/cancel`, data),
};

// ── Updates ────────────────────────────────────────────────────────────────────
export const updateApi = {
  create: (data: any) => apiClient.post("/api/updates", data),
  getByNGO: (ngoId: string, params?: any) =>
    apiClient.get(`/api/updates/ngo/${ngoId}`, { params }),
  update: (id: string, data: any) =>
    apiClient.patch(`/api/updates/${id}`, data),
  publish: (id: string) => apiClient.patch(`/api/updates/${id}/publish`),
  archive: (id: string) => apiClient.patch(`/api/updates/${id}/archive`),
  adminGetAll: (params?: any) =>
    apiClient.get("/api/updates/admin/all", { params }),
  flag: (id: string, data: any) =>
    apiClient.patch(`/api/updates/${id}/flag`, data),
};

// ── Donations ──────────────────────────────────────────────────────────────────
export const donationApi = {
  getByNGO: (ngoId: string, params?: any) =>
    apiClient.get(`/api/donations/ngo/${ngoId}`, { params }),
  adminGetAll: (params?: any) =>
    apiClient.get("/api/donations/admin/all", { params }),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: (params?: any) => apiClient.get("/api/users", { params }),
  suspend: (id: string, data?: any) =>
    apiClient.patch(`/api/users/${id}/suspend`, data),
  reactivate: (id: string) => apiClient.patch(`/api/users/${id}/reactivate`),
  changeRole: (id: string, data: any) =>
    apiClient.patch(`/api/users/${id}/role`, data),
};

// ── Admin ──────────────────────────────────────────────────────────────────────
export const adminApi = {
  getAnalytics: () => apiClient.get("/api/admin/analytics"),
  getAuditLogs: (params?: any) =>
    apiClient.get("/api/admin/audit-logs", { params }),
  getTeam: () => apiClient.get("/api/admin/team"),
  inviteAdmin: (data: any) => apiClient.post("/api/admin/team/invite", data),
  updatePermissions: (id: string, data: any) =>
    apiClient.patch(`/api/admin/team/${id}/permissions`, data),
  removeAdmin: (id: string) => apiClient.delete(`/api/admin/team/${id}`),
};

// ── Invitations (token-based) ──────────────────────────────────────────────────
// These endpoints are token-based — invitees may not yet have a GivHive account.
// `accept` uses the Firebase ID token (attached by the request interceptor),
// and the backend verifies it directly without the standard auth middleware.
export const invitationApi = {
  getByToken: (token: string) => apiClient.get(`/api/invitations/${token}`),
  accept: (token: string, data?: { firstName?: string; lastName?: string }) =>
    apiClient.post(`/api/invitations/${token}/accept`, data ?? {}),
  decline: (token: string) =>
    apiClient.post(`/api/invitations/${token}/decline`),
};

export default apiClient;
