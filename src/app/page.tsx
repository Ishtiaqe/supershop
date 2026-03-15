"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async function checkSession() {
      try {
        const resp = await api.get("/users/me");
        if (resp?.data) {
          router.push("/pos");
          return;
        }
      } catch {
        // Not authenticated
      }
      router.push("/login");
    })();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
