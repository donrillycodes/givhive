import { useEffect } from "react";
import { auth, onAuthChange, logOut, getToken } from "../lib/firebase";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { User } from "../types";

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    setUser,
    setToken,
    setLoading,
    signOut: clearAuth,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await getToken();
          if (auth.currentUser?.uid !== firebaseUser.uid) return;
          setToken(token);

          const response = await authApi.getMe();
          // Ignore responses from a session that signed out while this request
          // was in flight, including account deletion cleanup.
          if (auth.currentUser?.uid !== firebaseUser.uid) return;
          const dbUser: User = response.data.data.user;
          setUser(dbUser);
        } catch (error) {
          if (auth.currentUser?.uid !== firebaseUser.uid) return;
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await logOut();
      clearAuth();
    } catch (error) {}
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut: handleSignOut,
    isNGO: user?.role === "NGO",
    isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
  };
}
