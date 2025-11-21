"use client";

import React, { createContext, useEffect, useState, useCallback } from "react";
import { NetworkDetector } from "@/lib/offline-utils";
import { offlineQueue } from "@/lib/offline-queue";

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: "idle" | "syncing" | "error";
  pendingOperations: number;
  lastSyncTime: number | null;
  triggerSync: () => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  syncStatus: "idle",
  pendingOperations: 0,
  lastSyncTime: null,
  triggerSync: async () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle"
  );
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const networkDetector = NetworkDetector.getInstance();

  const updatePendingCount = useCallback(async () => {
    const items = await offlineQueue.getPendingItems();
    setPendingOperations(items.length);
  }, []);

  const syncDataToIndexedDB = useCallback(async () => {
    // This function syncs data from server to IndexedDB when online
    // It should be called after login or when coming back online
    if (!isOnline) return;

    try {
      const { offlineDb } = await import("@/lib/offline-db");
      const api = await import("@/lib/api");

      // Get tenant from localStorage (set during login)
      const authData = localStorage.getItem("auth");
      if (!authData) return;

      const { tenantId } = JSON.parse(authData);
      if (!tenantId) return;

      // Sync inventory data
      try {
        const inventoryResponse = await api.default.get("/inventory");
        const inventoryItems = inventoryResponse.data;

        for (const item of inventoryItems) {
          await offlineDb.putInventoryItem({
            ...item,
            _lastModified: Date.now(),
            _syncStatus: "synced" as const,
            _serverVersion: 1,
          });
        }
      } catch (err) {
        console.error("Failed to sync inventory:", err);
      }

      // Sync catalog/products data
      try {
        const catalogResponse = await api.default.get("/catalog");
        const products = catalogResponse.data;

        for (const product of products) {
          await offlineDb.putProduct({
            ...product,
            _lastModified: Date.now(),
            _syncStatus: "synced" as const,
          });
        }
      } catch (err) {
        console.error("Failed to sync catalog:", err);
      }

      console.log("✅ Data synced to IndexedDB");
    } catch (error) {
      console.error("Failed to sync data to IndexedDB:", error);
    }
  }, [isOnline]);

  const triggerSync = useCallback(async () => {
    if (!isOnline || syncStatus === "syncing") return;

    setSyncStatus("syncing");
    try {
      await offlineQueue.processQueue();
      setLastSyncTime(Date.now());
      setSyncStatus("idle");
      await updatePendingCount();
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus("error");
    }
  }, [isOnline, syncStatus, updatePendingCount]);

  useEffect(() => {
    // Initialize IndexedDB immediately
    const initDB = async () => {
      try {
        const { offlineDb } = await import("@/lib/offline-db");
        await offlineDb.init();
        console.log("✅ IndexedDB initialized");
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
      }
    };

    initDB();

    // Initial check
    setIsOnline(networkDetector.isOnline());
    updatePendingCount();

    // Sync data to IndexedDB on mount if online
    if (networkDetector.isOnline()) {
      // Delay sync slightly to allow time for login
      setTimeout(() => syncDataToIndexedDB(), 1000);
    }

    // Listen for network changes
    const unsubscribe = networkDetector.onStatusChange((online) => {
      setIsOnline(online);
      if (online) {
        triggerSync();
        syncDataToIndexedDB(); // Sync data when coming back online
      }
    });

    // Listen for queue changes
    const unsubscribeQueue = offlineQueue.onQueueChange(() => {
      updatePendingCount();
    });

    // Register service worker - use the workbox-generated one
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js") // next-pwa generates sw.js
          .then((registration) => {
            console.log("✅ Service Worker registered:", registration.scope);
          })
          .catch((error) => {
            console.error("❌ Service Worker registration failed:", error);
          });
      });
    }

    return () => {
      unsubscribe();
      unsubscribeQueue();
    };
  }, [networkDetector, triggerSync, updatePendingCount, syncDataToIndexedDB]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        syncStatus,
        pendingOperations,
        lastSyncTime,
        triggerSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
