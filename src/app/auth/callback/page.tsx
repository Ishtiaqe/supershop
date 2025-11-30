"use client";

import { useEffect } from "react";
import api from '@/lib/api';
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh");

    if (token && refreshToken) {
      (async () => {
        try {
          // Instead of storing tokens in localStorage, post refresh token to /auth/refresh
          // which will set HttpOnly cookies and return new tokens as needed. The
          // server will read the refresh token from cookie or the provided body.
          if (refreshToken) {
            await api.post('/auth/refresh', { refreshToken });
          } else {
            await api.post('/auth/refresh');
          }

          // Now fetch the user profile using the cookie-based session
          try {
            const userResp = await api.get('/users/me');
            if (userResp?.data) {
              localStorage.setItem('user', JSON.stringify(userResp.data));
            }
          } catch (err) {
            // If fetching user fails, continue; user may be fetched later on dashboard
            console.warn('Failed to fetch user info after refresh', err);
          }

          router.push('/dashboard');
        } catch (error) {
          console.error('Auth callback error:', error);
          router.push('/login?error=auth_failed');
        }
      })();
    } else {
      router.push('/login?error=missing_tokens');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="text-center bg-card/90 backdrop-blur-xl p-12 rounded-2xl shadow-2xl">
        <Spin size="large" />
        <p className="mt-6 text-foreground text-lg font-medium">
          Completing sign in...
        </p>
        <p className="mt-2 text-muted-foreground text-sm">Please wait</p>
      </div>
    </div>
  );
}
