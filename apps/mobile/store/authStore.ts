import { create } from "zustand";
import { type User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setToken: (token) => set({ token }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    }),
}));

// Navigation store — for deep linking to specific tabs, and for tracking
// which tab is active so a screen pushed on top of the tab navigator can
// show that tab's name as its native back-button label.
interface NavigationState {
  activityTab: 'donations' | 'pledges';
  setActivityTab: (tab: 'donations' | 'pledges') => void;
  activeTabTitle: string;
  setActiveTabTitle: (title: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activityTab: 'donations',
  setActivityTab: (tab) => set({ activityTab: tab }),
  activeTabTitle: 'Home',
  setActiveTabTitle: (title) => set({ activeTabTitle: title }),
}));