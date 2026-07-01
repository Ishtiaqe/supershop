import React, { createContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { NetworkDetector } from '@/lib/offline-utils';
import { offlineSync } from '@/lib/offline-sync';
import { offlineQueue } from '@/lib/offline-queue';
import { BackgroundSyncEvent, OfflineStatus, OfflineQueueItem } from '@/types/offline';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  offlineStatus: OfflineStatus;
  failedItems: OfflineQueueItem[];
  forceSync: () => Promise<void>;
  retryFailedItem: (id: string) => Promise<void>;
  discardFailedItem: (id: string) => Promise<void>;
  clearStorage: (opts?: { force?: boolean }) => Promise<void>;
  getStorageUsage: () => Promise<{ used: number; available: number } | null>;
}

export const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: true,
    lastOnline: 0,
    syncInProgress: false,
    pendingOperations: 0
  });
  const [failedItems, setFailedItems] = useState<OfflineQueueItem[]>([]);

  const networkDetector = NetworkDetector.getInstance();

  const refreshQueueCounts = useCallback(async () => {
    const [pending, failed] = await Promise.all([
      offlineQueue.getPendingItems(),
      offlineQueue.getFailedItems()
    ]);
    setOfflineStatus(prev => ({ ...prev, pendingOperations: pending.length }));
    setFailedItems(failed);
  }, []);

  useEffect(() => {
    // Initialize network status
    const online = networkDetector.isOnline();
    setIsOnline(online);
    setOfflineStatus(prev => ({
      ...prev,
      isOnline: online,
      lastOnline: Date.now()
    }));
    refreshQueueCounts();

    // Listen for network changes
    const unsubscribe = networkDetector.onStatusChange((online) => {
      setIsOnline(online);
      setOfflineStatus(prev => ({
        ...prev,
        isOnline: online,
        lastOnline: online ? Date.now() : prev.lastOnline
      }));
    });

    // Listen for sync events
    const syncUnsubscribe = offlineSync.onSyncEvent((event: BackgroundSyncEvent) => {
      switch (event.type) {
        case 'sync-start':
          setIsSyncing(true);
          setOfflineStatus(prev => ({ ...prev, syncInProgress: true }));
          break;
        case 'sync-complete':
          setIsSyncing(false);
          setLastSyncTime(Date.now());
          setOfflineStatus(prev => ({ ...prev, syncInProgress: false }));
          refreshQueueCounts();
          break;
        case 'sync-error':
          setIsSyncing(false);
          setOfflineStatus(prev => ({ ...prev, syncInProgress: false }));
          refreshQueueCounts();
          break;
      }
    });

    // Keep pending/failed counts current as items are queued and processed —
    // this is what actually powers the "N operations pending" UI and the
    // failed-item alert, instead of a count that never moves off zero.
    const queueUnsubscribe = offlineQueue.onQueueChange(() => {
      refreshQueueCounts();
    });

    return () => {
      unsubscribe();
      syncUnsubscribe();
      queueUnsubscribe();
    };
  }, [networkDetector, refreshQueueCounts]);

  const forceSync = async () => {
    try {
      await offlineSync.forceSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      await refreshQueueCounts();
    }
  };

  const retryFailedItem = async (id: string) => {
    await offlineQueue.retryItem(id);
    await refreshQueueCounts();
  };

  const discardFailedItem = async (id: string) => {
    await offlineQueue.discardItem(id);
    await refreshQueueCounts();
  };

  const clearStorage = async (opts?: { force?: boolean }) => {
    // Real sales/inventory/cash-box writes can be sitting unsynced in the
    // offline queue (still pending, or failed after retries but deliberately
    // kept — see offline-queue.ts). Wiping IndexedDB here would delete that
    // data with no way to recover it, so this refuses unless the caller
    // passes force:true after explicitly warning the user.
    const [pending, failed] = await Promise.all([
      offlineQueue.getPendingItems(),
      offlineQueue.getFailedItems()
    ]);
    const unsynced = pending.length + failed.length;
    if (unsynced > 0 && !opts?.force) {
      throw new Error(
        `${unsynced} unsynced operation(s) would be lost. Sync or discard them first, or pass force:true to proceed anyway.`
      );
    }

    // Clear IndexedDB data
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases?.() || [];
      for (const db of databases) {
        if (db.name?.includes('SuperShop')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }

    // Clear localStorage offline data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('offline_') || key.startsWith('api_cache_')) {
        localStorage.removeItem(key);
      }
    });

    // Clear service worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }

    await refreshQueueCounts();
  };

  const getStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        };
      } catch {
        return null;
      }
    }
    return null;
  };

  const value: OfflineContextType = {
    isOnline,
    isSyncing,
    lastSyncTime,
    offlineStatus,
    failedItems,
    forceSync,
    retryFailedItem,
    discardFailedItem,
    clearStorage,
    getStorageUsage
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

// Progressive enhancement hook - works even without offline features
export function useProgressiveOffline() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if offline features are supported
    const supported = !!(
      'indexedDB' in window &&
      'serviceWorker' in navigator &&
      'caches' in window
    );
    setIsSupported(supported);
  }, []);

  return { isSupported };
}