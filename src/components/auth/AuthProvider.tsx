"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import api, { startProactiveRefresh } from "@/lib/api";

export type AuthContextType = {
  user: any | null;
  loading: boolean;
  refresh: () => Promise<any>;
  logout: () => Promise<void>;
  login: (user: any) => void;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window === "undefined") return null;
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const hydrateFromProfile = useCallback((profile: any) => {
    setUser(profile);
    try {
      localStorage.setItem("user", JSON.stringify(profile));
      if (profile?.tenant) {
        localStorage.setItem("tenant", JSON.stringify(profile.tenant));
      }
    } catch {}
  }, []);

  const fetchProfile = useCallback(async () => {
    const resp = await api.get("/users/me");
    if (!resp?.data) throw new Error("No user data");
    hydrateFromProfile(resp.data);
    return true;
  }, [hydrateFromProfile]);

  const refresh = useCallback(async (): Promise<any> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        return null;
      }

      const response = await api.post("/auth/refresh", { refreshToken });

      if (response.data?.accessToken && response.data?.refreshToken) {
        // Tokens are already stored by api interceptor
        // Fetch and update user profile
        try {
          const resp = await api.get("/users/me");
          if (resp?.data) {
            hydrateFromProfile(resp.data);
            return resp.data;
          }
        } catch (e) {
          console.warn("Token refresh succeeded but profile fetch failed:", e);
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [hydrateFromProfile]);

  const bootstrap = useCallback(async () => {
    setLoading(true);

    // Check if we have tokens
    const hasTokens =
      typeof window !== "undefined" &&
      localStorage.getItem("accessToken") &&
      localStorage.getItem("refreshToken");

    if (!hasTokens) {
      // No tokens, mark as unauthenticated
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Try current session
      await fetchProfile();
      setLoading(false);
      return;
    } catch {
      // Attempt refresh, then retry profile
      try {
        const userData = await refresh();
        if (userData) {
          setLoading(false);
          return;
        }
      } catch {}
      // Failed: clear all auth data
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
      } catch {}
      setUser(null);
      setLoading(false);
    }
  }, [fetchProfile, refresh]);

  useEffect(() => {
    // Start proactive refresh to keep session warm
    const stop = startProactiveRefresh(12 * 60 * 1000);
    // Bootstrap current session on mount
    bootstrap();
    return () => {
      stop && stop();
    };
  }, [bootstrap]);

  const logout = useCallback(async () => {
    try {
      // Refresh token is now in httpOnly cookie, backend reads it from there
      await api.post("/auth/logout");
    } catch {}
    setUser(null);
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("tenant");
    } catch {}
    // Navigate via hard redirect to ensure clean state
    if (typeof window !== "undefined") {
      window.location.href = "/login?logout=true";
    }
  }, []);

  const login = useCallback(
    (userData: any) => {
      hydrateFromProfile(userData);
    },
    [hydrateFromProfile],
  );

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, refresh, logout, login }),
    [user, loading, refresh, logout, login],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
