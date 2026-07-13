'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { useKeyboardOpen } from '@/hooks/useVisualViewportLayout';
import { formatDateTime } from '@/lib/ui-helpers';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OfflineIndicator() {
  const { isOnline, isSyncing, lastSyncTime } = useOffline();
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [lastNotification, setLastNotification] = useState<number>(0);

  useEffect(() => {
    const now = Date.now();

    if (!isOnline && now - lastNotification > 60000) {
      toast.warning('You are offline', {
        description: 'Some features may be limited. Your data will sync when connection returns.',
        duration: 4000,
      });
      setLastNotification(now);
    }

    if (isOnline && !isSyncing && lastSyncTime && now - lastSyncTime > 30000) {
      toast.success('Back online', {
        description: 'Syncing your data...',
        duration: 3000,
      });
    }
  }, [isOnline, isSyncing, lastSyncTime, lastNotification]);

  const getStatusColor = () => {
    if (!isOnline) return 'text-destructive border-destructive';
    if (isSyncing) return 'text-blue-500 border-blue-500';
    return 'text-emerald-500 border-emerald-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <>
      <div
        className="fixed top-[68px] right-3 sm:top-[72px] sm:right-6 z-[40] cursor-pointer"
        onClick={() => setShowOfflineModal(true)}
      >
        <div
          className={`flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg shadow-md border-2 ${getStatusColor()}`}
        >
          {getStatusIcon()}
          <span className="font-semibold text-xs uppercase tracking-wider">
            {getStatusText()}
          </span>
        </div>
      </div>

      <Dialog open={showOfflineModal} onOpenChange={setShowOfflineModal}>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connection Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Alert variant={!isOnline ? 'destructive' : 'default'} className="bg-background border shadow-sm">
              <AlertTitle className="font-semibold">{getStatusText()}</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-muted-foreground">
                {!isOnline
                  ? "You're currently offline. Your changes will be saved locally and synced when connection returns."
                  : isSyncing
                  ? "Syncing your data with the server..."
                  : "You're online and all data is synchronized."}
              </AlertDescription>
            </Alert>

            {lastSyncTime && (
              <div className="text-sm">
                <span className="font-semibold text-foreground">Last synced: </span>
                <span className="text-muted-foreground">{formatDateTime(new Date(lastSyncTime))}</span>
              </div>
            )}

            {!isOnline && (
              <Alert className="bg-background border shadow-sm">
                <AlertTitle className="font-semibold">Offline Capabilities</AlertTitle>
                <AlertDescription className="mt-1 text-xs text-muted-foreground">
                  You can continue working with inventory, sales, and products. All changes will be queued for sync.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setShowOfflineModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SyncStatus() {
  const { isSyncing, offlineStatus } = useOffline();
  const [syncProgress, setSyncProgress] = useState(0);
  const keyboardOpen = useKeyboardOpen();

  useEffect(() => {
    if (isSyncing) {
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      setSyncProgress(0);
    }
  }, [isSyncing]);

  if (!isSyncing || keyboardOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-card p-4 rounded-xl shadow-lg border border-border min-w-[300px] space-y-3 pb-safe">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        <span className="font-semibold text-sm text-foreground">Syncing data...</span>
      </div>

      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.round(syncProgress)}%` }}
        ></div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        {offlineStatus.pendingOperations > 0
          ? `${offlineStatus.pendingOperations} operations pending`
          : 'Synchronizing with server...'}
      </div>
    </div>
  );
}

export function OfflineNotification() {
  const { isOnline, forceSync } = useOffline();
  const [lastOfflineNotification, setLastOfflineNotification] = useState(0);

  useEffect(() => {
    if (!isOnline) {
      const now = Date.now();
      if (now - lastOfflineNotification > 300000) {
        toast.warning('Offline Mode Active', {
          description: 'You can continue working. Data will sync automatically when online.',
          duration: Infinity,
          id: 'offline-notification',
          action: {
            label: 'Try Sync Now',
            onClick: () => {
              forceSync();
            },
          },
        });
        setLastOfflineNotification(now);
      }
    } else {
      toast.dismiss('offline-notification');
    }
  }, [isOnline, forceSync, lastOfflineNotification]);

  return null;
}

const ENTITY_LABELS: Record<string, string> = {
  inventory: 'Inventory change',
  sale: 'Sale',
  'sales-history': 'Sale',
  saleItem: 'Sale item',
  product: 'Product',
  variant: 'Variant',
  user: 'User update',
  tenant: 'Tenant update',
};

// A queued write (a sale, a stock adjustment — real money) that failed 3
// times is never deleted (see offline-queue.ts) so it can't be silently
// lost. This makes that unresolved state impossible to miss: a persistent,
// non-auto-dismissing banner with per-item retry/discard, shown wherever the
// app shell renders.
export function FailedSyncAlert() {
  const { failedItems, retryFailedItem, discardFailedItem } = useOffline();
  const [retrying, setRetrying] = useState<string | null>(null);
  const keyboardOpen = useKeyboardOpen();

  if (failedItems.length === 0 || keyboardOpen) return null;

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await retryFailedItem(id);
    } finally {
      setRetrying(null);
    }
  };

  const handleDiscard = async (id: string) => {
    if (!window.confirm('Discard this unsynced operation permanently? This cannot be undone.')) return;
    await discardFailedItem(id);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg pb-safe">
      <Alert variant="destructive" className="shadow-lg border-2">
        <AlertTitle className="font-semibold">
          {failedItems.length} operation{failedItems.length > 1 ? 's' : ''} could not be synced
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-xs">
            These changes are still saved on this device but repeatedly failed to reach the server.
            Nothing has been lost — retry once you have a stable connection, or discard if it&apos;s no longer needed.
          </p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {failedItems.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-xs bg-background/50 rounded p-2">
                <span className="truncate">
                  {ENTITY_LABELS[item.entityType] || item.entityType} ({item.operation.toLowerCase()})
                  {item.lastError ? ` — ${item.lastError}` : ''}
                </span>
                <span className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" disabled={retrying === item.id} onClick={() => handleRetry(item.id)}>
                    Retry
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDiscard(item.id)}>
                    Discard
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}