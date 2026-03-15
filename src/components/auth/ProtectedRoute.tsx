"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = [], 
  fallbackPath = "/login" 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(fallbackPath);
      return;
    }

    if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
      router.push("/unauthorized");
      return;
    }
  }, [user, loading, router, requiredRole, fallbackPath]);

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

  if (!user) {
    return null;
  }

  if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
