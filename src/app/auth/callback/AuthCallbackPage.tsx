"use client";

import { useEffect } from "react";
import api from '@/lib/api';
import { authStorage } from '@/lib/auth-storage';
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh");

    if (token && refreshToken) {
      (async () => {
        try {
          authStorage.setAccessToken(token);
          authStorage.setRefreshToken(refreshToken);

          try {
            const userResp = await api.get('/users/me');
            if (userResp?.data) {
              authStorage.setUser(userResp.data);
            }
          } catch {
            // Non-fatal: user fetched on next load
          }

          navigate('/sales-history');
        } catch {
          navigate('/login?error=auth_failed');
        }
      })();
    } else {
      navigate('/login?error=missing_tokens');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center bg-card p-12 rounded-2xl shadow-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-6 text-foreground text-lg font-medium">Completing sign in...</p>
        <p className="mt-2 text-muted-foreground text-sm">Please wait</p>
      </div>
    </div>
  );
}
