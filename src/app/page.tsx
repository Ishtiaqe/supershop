"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Try to restore the last page from sessionStorage, fallback to /pos
          const lastPath = sessionStorage.getItem("lastPath");
          const defaultPath = lastPath && lastPath !== "/" ? lastPath : "/pos";
          navigate(defaultPath, { replace: true });
          return;
        }
      } catch (err) {
        console.warn("Session check failed:", err);
      }
      navigate("/login", { replace: true });
    })();
  }, [navigate]);

  // Store current path for restoration on reload
  useEffect(() => {
    if (location.pathname !== "/" && location.pathname !== "/login") {
      sessionStorage.setItem("lastPath", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
