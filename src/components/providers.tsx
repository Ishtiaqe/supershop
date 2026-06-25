"use client";

import { QueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { ConfigProvider, theme as antdTheme, App } from "antd";
import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { OfflineProvider } from "./providers/offline-provider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ItemDetailProvider } from "@/components/providers/ItemDetailContext";
import { getThemeColors } from "@/lib/theme";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

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
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
          },
        },
      })
  );

  // ponytail: async IDB persister — no localStorage main-thread blocking
  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: { getItem: get, setItem: set, removeItem: del },
      }),
    []
  );

  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as ThemeMode | null;
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setMode(storedTheme);
    }
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

  const isDark = mode === "dark" || (mode === "system" && systemDark);
  const colors = getThemeColors(isDark ? "dark" : "light");

  const themeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: colors.primary.hex,
      colorInfo: colors.primary.hex,
      colorSuccess: colors.success.hex,
      colorWarning: colors.warning.hex,
      colorError: colors.destructive.hex,
      colorBgBase: colors.background.hex,
      colorBgContainer: colors.card.hex,
      colorBgElevated: colors.card.hex,
      colorTextBase: colors.foreground.hex,
      colorTextSecondary: colors.mutedForeground.hex,
      colorBorder: colors.border.hex,
      colorBgLayout: colors.background.hex,
      borderRadius: 8,
      fontFamily: "inherit",
    },
    components: {
      Menu: { itemHeight: 48, itemFontSize: 15 },
      Button: { borderRadius: 6, fontWeight: 500 },
      Card: { borderRadiusLG: 12 },
      Table: { borderRadius: 12 },
    },
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider theme={themeConfig}>
        <App>
          <OfflineProvider>
            <AuthProvider>
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{ persister }}
              >
                <ItemDetailProvider>
                  {children}
                </ItemDetailProvider>
                {import.meta.env.DEV && (
                  <Suspense fallback={null}>
                    <ReactQueryDevtools initialIsOpen={false} />
                  </Suspense>
                )}
              </PersistQueryClientProvider>
            </AuthProvider>
          </OfflineProvider>
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
