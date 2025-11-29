"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh");

    if (token && refreshToken) {
      try {
        // Store tokens
        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshToken", refreshToken);

        // Decode JWT to get user info (simple base64 decode)
        const payload = JSON.parse(atob(token.split(".")[1]));

        // The payload contains { sub: userId }
        // We'll fetch the full user info on the dashboard
        console.log("Auth successful, user ID:", payload.sub);

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=auth_failed");
      }
    } else {
      router.push("/login?error=missing_tokens");
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
