"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { OfflineProvider } from "./providers/OfflineProvider";

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

  useEffect(() => {
    if (mode === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", mode);
    }
  }, [mode]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      // system mode
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        root.classList.remove("light");
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    }
  }, [mode]);

  // Determine antd algorithm and tokens
  const prefersDark =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);

  const themeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: isDark
      ? {
          colorPrimary: "#6366f1", // Indigo 500
          colorBgContainer: "#1e293b", // Slate 800
          colorBgElevated: "#0f172a", // Slate 900
          colorText: "#f8fafc", // Slate 50
          colorTextSecondary: "#94a3b8", // Slate 400
          colorBorder: "#334155", // Slate 700
          colorBgLayout: "#0b1120", // Deep dark
          borderRadius: 8,
        }
      : {
          colorPrimary: "#4f46e5", // Indigo 600
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
          colorText: "#0f172a", // Slate 900
          colorTextSecondary: "#64748b", // Slate 500
          colorBorder: "#e2e8f0", // Slate 200
          colorBgLayout: "#f9fafb", // Gray 50
          borderRadius: 8,
        },
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider theme={themeConfig}>
        <OfflineProvider>
          {persister ? (
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister }}
            >
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </PersistQueryClientProvider>
          ) : (
            // Fallback for SSR or if persistence fails
            <QueryClientProvider client={queryClient}>
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          )}
        </OfflineProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
