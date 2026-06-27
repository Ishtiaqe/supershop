"use client";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import api from "@/lib/api";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    (async function checkSession() {
      try {
        const resp = await api.get("/users/me");
        if (resp?.data) {
          navigate("/pos", { replace: true });
          return;
        }
      } catch {
        // Not authenticated
      }
      navigate("/login", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
