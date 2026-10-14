import axios, { type AxiosInstance, type AxiosError } from "axios";
import { getToken } from "./firebase";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Attach Firebase JWT token to every request
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

// Handle errors consistently
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  getMe: () => apiClient.get("/api/auth/me"),
  register: (data: any) => apiClient.post("/api/auth/register", data),
  deleteAccount: () => apiClient.delete<{ data: { status: "completed" | "pending" } }>(
    "/api/auth/account", { timeout: 30000 },
  ),
};

// ── NGO ────────────────────────────────────────────────────────────────────────
export const ngoApi = {
  getAll: (params?: any) => apiClient.get("/api/ngos", { params }),
  getOne: (identifier: string) => apiClient.get(`/api/ngos/${identifier}`),
};

// ── Food Needs ─────────────────────────────────────────────────────────────────
export const foodNeedApi = {
  getAll: (params?: any) => apiClient.get("/api/food-needs", { params }),
  getOne: (id: string) => apiClient.get(`/api/food-needs/${id}`),
  pledge: (data: any) => apiClient.post("/api/food-pledges", data),
};

// ── Donations ──────────────────────────────────────────────────────────────────
export const donationApi = {
  create: (data: any) => apiClient.post("/api/donations", data),
  checkout: (data: {
    ngoId: string;
    amount: number;
    currency: string;
    message?: string;
    isAnonymous?: boolean;
  }) => apiClient.post("/api/donations/checkout", data),
  getMyDonations: (params?: any) =>
    apiClient.get("/api/users/donations", { params }),
};

// ── Pledges ────────────────────────────────────────────────────────────────────
export const pledgeApi = {
  getMyPledges: (params?: any) =>
    apiClient.get("/api/users/pledges", { params }),
  cancel: (id: string, data: any) =>
    apiClient.patch(`/api/food-pledges/${id}/cancel`, data),
};

// ── Notifications ──────────────────────────────────────────────────────────────
export const notificationApi = {
  getAll: (params?: any) => apiClient.get("/api/notifications", { params }),
  getUnreadCount: () => apiClient.get("/api/notifications/unread-count"),
  markRead: (id: string) => apiClient.patch(`/api/notifications/${id}/read`),
  markAllRead: () => apiClient.patch("/api/notifications/read-all"),
};

// ── Updates ────────────────────────────────────────────────────────────────────
export const updateApi = {
  getAll: (params?: any) => apiClient.get("/api/updates", { params }),
  getOne: (id: string) => apiClient.get(`/api/updates/${id}`),
};

export default apiClient;
