"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import React from "react";
import dynamic from "next/dynamic";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { OfflineProvider } from "./providers/offline-provider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getThemeColors } from "@/lib/theme";

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools,
    ),
  { ssr: false },
);

type ThemeMode = "light" | "dark" | "system";

const ThemeContext = React.createContext({
  mode: "system" as ThemeMode,
  // noop
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
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
          },
        },
      })
  );

  const [persister] = useState(() => {
    if (typeof window !== "undefined") {
      return createSyncStoragePersister({
        storage: window.localStorage,
      });
    }
    return undefined;
  });

  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("theme") as ThemeMode) || "system";
  });

  // Track system dark preference reactively
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    if (mode === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", mode);
    }
  }, [mode]);

  // Listen for OS theme changes in real time
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply theme class to document whenever mode or systemDark changes
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

  const isDark = mode === "dark" || (mode === "system" && systemDark);
  const colors = getThemeColors(isDark ? "dark" : "light");

  const themeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: colors.primary.hex,
      colorBgContainer: colors.card.hex,
      colorBgElevated: colors.card.hex,
      colorText: colors.foreground.hex,
      colorTextSecondary: colors.mutedForeground.hex,
      colorBorder: colors.border.hex,
      colorBgLayout: colors.background.hex,
      borderRadius: 8,
    },
    components: {
      Menu: {
        itemHeight: 48,
        itemFontSize: 15,
      },
    },
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider theme={themeConfig}>
        <OfflineProvider>
          <AuthProvider>
            {persister ? (
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{ persister }}
              >
                {children}
                {process.env.NODE_ENV === "development" && (
                  <ReactQueryDevtools initialIsOpen={false} />
                )}
              </PersistQueryClientProvider>
            ) : (
              // Fallback for SSR or if persistence fails
              <QueryClientProvider client={queryClient}>
                {children}
                {process.env.NODE_ENV === "development" && (
                  <ReactQueryDevtools initialIsOpen={false} />
                )}
              </QueryClientProvider>
            )}
          </AuthProvider>
        </OfflineProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
