"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Shell = dynamic(() => import("@/components/shell/Shell"), {
  ssr: false,
});

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function AppShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (AUTH_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return <Shell>{children}</Shell>;
}
