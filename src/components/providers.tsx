"use client";

import { QueryClient, QueryClient as QueryClientType } from "@tanstack/react-query";
import { Suspense, useState, useEffect, useMemo } from "react";
import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { OfflineProvider } from "./providers/offline-provider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ItemDetailProvider } from "@/components/providers/ItemDetailContext";
import { TenantProvider } from "@/components/providers/TenantProvider";
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { FailedSyncAlert } from "@/components/offline-status";
import { lazyWithRetry } from "@/components/LazyImportErrorBoundary";

const ReactQueryDevtools = lazyWithRetry(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

// Query key factory with tenant isolation
export const queryKeys = {
  all: ['tenant'] as const,
  tenant: (tenantId: string) => [...queryKeys.all, tenantId] as const,
  products: (tenantId: string) => [...queryKeys.tenant(tenantId), 'products'] as const,
  variants: (tenantId: string) => [...queryKeys.tenant(tenantId), 'variants'] as const,
  inventory: (tenantId: string) => [...queryKeys.tenant(tenantId), 'inventory'] as const,
  sales: (tenantId: string) => [...queryKeys.tenant(tenantId), 'sales'] as const,
  // Non-tenant-specific keys (e.g., medicine database)
  medicines: ['medicines'] as const,
  medicineGenerics: ['medicineGenerics'] as const,
  medicineManufacturers: ['medicineManufacturers'] as const,
};

// Helper to clear tenant-specific queries
export function clearTenantQueries(queryClient: QueryClientType, tenantId: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      // Clear queries that start with the tenant prefix
      return Array.isArray(queryKey) && queryKey[0] === 'tenant' && queryKey[1] === tenantId;
    },
  });
}

type ThemeMode = "light" | "dark" | "system";

const ThemeContext = React.createContext({
  mode: "system" as ThemeMode,
  setMode: (() => {}) as (m: ThemeMode) => void,
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      })
  );

  // Expose queryClient globally for tenant-specific clearing
  useEffect(() => {
    (window as any).__queryClient = queryClient;
  }, [queryClient]);

  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: { getItem: get, setItem: set, removeItem: del },
      }),
    []
  );

  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const storedTheme = localStorage.getItem("theme") as ThemeMode | null;
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      return storedTheme;
    }
    return "system";
  });
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    if (mode === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", mode);
    }
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = mode === "dark" || (mode === "system" && systemDark);
    if (prefersDark) {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [mode, systemDark]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <OfflineProvider>
        <AuthProvider>
          <TenantProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister }}
            >
              <ItemDetailProvider>
                {children}
                <PWAUpdatePrompt />
                <PWAInstallPrompt />
                <FailedSyncAlert />
              </ItemDetailProvider>
              {import.meta.env.DEV && (
                <Suspense fallback={null}>
                  <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
              )}
            </PersistQueryClientProvider>
          </TenantProvider>
        </AuthProvider>
      </OfflineProvider>
    </ThemeContext.Provider>
  );
}
