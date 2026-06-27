"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredRole = [],
  fallbackPath = "/login",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(fallbackPath);
      return;
    }
    if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
      navigate("/unauthorized");
    }
  }, [user, loading, navigate, requiredRole, fallbackPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole.length > 0 && !requiredRole.includes(user.role)) return null;

  return <>{children}</>;
}
