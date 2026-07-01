"use client";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useSupabaseAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // Try to restore the last page from sessionStorage, fallback to /pos
      const lastPath = sessionStorage.getItem("lastPath");
      const defaultPath = lastPath && lastPath !== "/" ? lastPath : "/pos";
      navigate(defaultPath, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
