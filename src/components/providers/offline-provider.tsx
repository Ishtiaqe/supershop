import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { NetworkDetector } from '@/lib/offline-utils';
import { offlineSync } from '@/lib/offline-sync';
import { BackgroundSyncEvent, OfflineStatus } from '@/types/offline';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  offlineStatus: OfflineStatus;
  forceSync: () => Promise<void>;
  clearStorage: () => Promise<void>;
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
    lastOnline: Date.now(),
    syncInProgress: false,
    pendingOperations: 0
  });

  const networkDetector = NetworkDetector.getInstance();

  useEffect(() => {
    // Initialize network status
    setIsOnline(networkDetector.isOnline());

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
          break;
        case 'sync-error':
          setIsSyncing(false);
          setOfflineStatus(prev => ({ ...prev, syncInProgress: false }));
          break;
      }
    });

    return () => {
      unsubscribe();
      syncUnsubscribe();
    };
  }, [networkDetector]);

  const forceSync = async () => {
    try {
      await offlineSync.forceSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const clearStorage = async () => {
    try {
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

      
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
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
    forceSync,
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