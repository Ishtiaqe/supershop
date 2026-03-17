"use client";

import { usePathname } from "next/navigation";
import Shell from "@/components/shell/Shell";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function AppShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (AUTH_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return <Shell>{children}</Shell>;
}
