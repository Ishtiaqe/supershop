"use client";

import { useEffect } from "react";
import api from '@/lib/api';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin } from "antd";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh");

    if (token && refreshToken) {
      (async () => {
        try {
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', refreshToken);

          try {
            const userResp = await api.get('/users/me');
            if (userResp?.data) {
              localStorage.setItem('user', JSON.stringify(userResp.data));
            }
          } catch {
            // Non-fatal: user fetched on next load
          }

          navigate('/sales');
        } catch {
          navigate('/login?error=auth_failed');
        }
      })();
    } else {
      navigate('/login?error=missing_tokens');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="text-center bg-card/90 backdrop-blur-xl p-12 rounded-2xl shadow-2xl">
        <Spin size="large" />
        <p className="mt-6 text-foreground text-lg font-medium">Completing sign in...</p>
        <p className="mt-2 text-muted-foreground text-sm">Please wait</p>
      </div>
    </div>
  );
}
