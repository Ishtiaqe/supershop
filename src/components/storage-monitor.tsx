'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Trash2 } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

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

interface StorageInfo {
  used: number;
  available: number;
  percentage: number;
  status: 'normal' | 'warning' | 'error';
}

export function StorageMonitor() {
  const { getStorageUsage, clearStorage } = useOffline();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      const usage = await getStorageUsage();
      if (usage) {
        const percentage = (usage.used / usage.available) * 100;
        let status: 'normal' | 'warning' | 'error' = 'normal';

        if (percentage > 90) status = 'error';
        else if (percentage > 75) status = 'warning';

        setStorageInfo({
          ...usage,
          percentage,
          status
        });
      }
    };

    checkStorage();
    const interval = setInterval(checkStorage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getStorageUsage]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      await clearStorage();
      const usage = await getStorageUsage();
      if (usage) {
        const percentage = (usage.used / usage.available) * 100;
        setStorageInfo({
          ...usage,
          percentage,
          status: percentage > 90 ? 'error' : percentage > 75 ? 'warning' : 'normal'
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  if (!storageInfo) return null;

  const getStatusColor = () => {
    switch (storageInfo.status) {
      case 'error': return 'text-destructive border-destructive';
      case 'warning': return 'text-amber-500 border-amber-500';
      default: return 'text-emerald-500 border-emerald-500';
    }
  };

  const getStatusBgColor = () => {
    switch (storageInfo.status) {
      case 'error': return 'bg-destructive';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-emerald-500';
    }
  };

  const getStatusMessage = () => {
    switch (storageInfo.status) {
      case 'error':
        return 'Storage is critically low. Please clear old data.';
      case 'warning':
        return 'Storage is getting full. Consider cleaning up old data.';
      default:
        return 'Storage usage is normal.';
    }
  };

  return (
    <>
      <div
        className="fixed bottom-6 left-6 z-[40] cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div
          className={`flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg shadow-md border-2 ${getStatusColor()}`}
        >
          <Database className="w-4 h-4" />
          <span className="font-semibold text-xs">
            {Math.round(storageInfo.percentage)}%
          </span>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Storage Management</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Storage Usage</h4>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getStatusBgColor()}`}
                  style={{ width: `${Math.round(storageInfo.percentage)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatBytes(storageInfo.used)} of {formatBytes(storageInfo.available)} used
              </div>
            </div>

            <Alert variant={storageInfo.status === 'error' ? 'destructive' : 'default'} className="bg-background border shadow-sm">
              <AlertTitle className="font-semibold">Storage Status</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-muted-foreground">
                {getStatusMessage()}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Cleanup Actions</h4>
              <p className="text-xs text-muted-foreground">
                Clearing storage will remove cached data, offline queue, and temporary files.
                Your core data will remain intact.
              </p>

              <div className="space-y-2 divide-y divide-border text-sm">
                <div className="flex items-start gap-2.5 py-2 first:pt-0">
                  <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground">Clear Offline Cache</div>
                    <div className="text-xs text-muted-foreground">Remove cached API responses and temporary data</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 py-2">
                  <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground">Clear IndexedDB</div>
                    <div className="text-xs text-muted-foreground">Remove local database (use with caution)</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 py-2 last:pb-0">
                  <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground">Clear Service Worker Cache</div>
                    <div className="text-xs text-muted-foreground">Remove cached static assets</div>
                  </div>
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full mt-2"
                disabled={isCleaning}
                onClick={handleCleanup}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isCleaning ? 'Cleaning...' : 'Clear All Storage'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useStorageMonitor() {
  const { getStorageUsage, clearStorage } = useOffline();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const usage = await getStorageUsage();
      if (usage) {
        const percentage = (usage.used / usage.available) * 100;
        setStorageInfo({
          ...usage,
          percentage,
          status: percentage > 90 ? 'error' : percentage > 75 ? 'warning' : 'normal'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [getStorageUsage]);

  const cleanup = async () => {
    setIsLoading(true);
    try {
      await clearStorage();
      await refreshStorage();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  return {
    storageInfo,
    isLoading,
    refreshStorage,
    cleanup
  };
}