'use client';

import React, { useState, useEffect } from 'react';
import { Button, Progress, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { toast } from 'sonner';
import { WifiOff, WifiIcon, RefreshCw } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

export function OfflineIndicator() {
  const { isOnline, isSyncing, lastSyncTime } = useOffline();
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [lastNotification, setLastNotification] = useState<number>(0);

  useEffect(() => {
    const now = Date.now();

    // Show notification when going offline (max once per minute)
    if (!isOnline && now - lastNotification > 60000) {
      toast.error('You are offline', {
        description: 'Some features may be limited. Your data will sync when connection returns.',
        duration: 4000,
      });
      setLastNotification(now);
    }

    // Show notification when coming back online
    if (isOnline && !isSyncing && lastSyncTime && now - lastSyncTime > 30000) {
      toast.success('Back online', {
        description: 'Syncing your data...',
        duration: 3000,
      });
    }
  }, [isOnline, isSyncing, lastSyncTime, lastNotification]);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (isSyncing) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusBorderColor = () => {
    if (!isOnline) return 'border-red-500';
    if (isSyncing) return 'border-blue-500';
    return 'border-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />;
    return <WifiIcon className="w-4 h-4" />;
  };

  return (
    <>
      <div
        className="fixed top-16 right-6 z-50 cursor-pointer"
        onClick={() => setShowOfflineModal(true)}
      >
        <div
          className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md shadow-md border-2 ${getStatusBorderColor()}`}
        >
          <span className={getStatusColor()}>
            {getStatusIcon()}
          </span>
          <span className={`${getStatusColor()} font-medium text-sm`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      <Modal isOpen={showOfflineModal} onOpenChange={setShowOfflineModal}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Connection Status
          </ModalHeader>
          <ModalBody className="gap-4">
            {/* Status Alert */}
            <div className={`p-4 rounded-lg border ${
              !isOnline
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : isSyncing
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <h3 className={`font-semibold text-sm mb-1 ${
                !isOnline
                  ? 'text-yellow-900 dark:text-yellow-100'
                  : isSyncing
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-green-900 dark:text-green-100'
              }`}>
                {getStatusText()}
              </h3>
              <p className={`text-sm ${
                !isOnline
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : isSyncing
                  ? 'text-blue-800 dark:text-blue-200'
                  : 'text-green-800 dark:text-green-200'
              }`}>
                {!isOnline
                  ? "You're currently offline. Your changes will be saved locally and synced when connection returns."
                  : isSyncing
                  ? "Syncing your data with the server..."
                  : "You're online and all data is synchronized."}
              </p>
            </div>

            {/* Last Sync Time */}
            {lastSyncTime && (
              <div className="text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Last synced: </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(lastSyncTime).toLocaleString()}
                </span>
              </div>
            )}

            {/* Offline Capabilities */}
            {!isOnline && (
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-sm mb-1 text-blue-900 dark:text-blue-100">
                  Offline Capabilities
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You can continue working with inventory, sales, and products. All changes will be queued for sync.
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onPress={() => setShowOfflineModal(false)}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export function SyncStatus() {
  const { isSyncing, offlineStatus } = useOffline();
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      // Simulate progress (in real implementation, this would come from sync events)
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

  if (!isSyncing) return null;

  const progressPercent = Math.round(syncProgress);

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 min-w-80">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="font-semibold text-gray-900 dark:text-gray-50">Syncing data...</span>
        </div>

        {/* Progress Bar */}
        <Progress
          value={progressPercent}
          className="max-w-full"
          color="primary"
          size="sm"
          showValueLabel={false}
        />

        {/* Status Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {offlineStatus.pendingOperations > 0
            ? `${offlineStatus.pendingOperations} operations pending`
            : 'Synchronizing with server...'}
        </p>
      </div>
    </div>
  );
}

export function OfflineNotification() {
  const { isOnline, forceSync } = useOffline();
  const [lastOfflineNotification, setLastOfflineNotification] = useState(0);
  const [notificationId, setNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) {
      const now = Date.now();
      // Only show notification once every 5 minutes when offline
      if (now - lastOfflineNotification > 300000) {
        const id = toast.warning('Offline Mode Active', {
          description: 'You can continue working. Data will sync automatically when online.',
          duration: 0, // Don't auto-close
          action: {
            label: 'Try Sync Now',
            onClick: () => {
              forceSync();
              if (notificationId) {
                toast.dismiss(notificationId);
              }
            },
          },
        });
        setNotificationId(String(id));
        setLastOfflineNotification(now);
      }
    } else {
      // Clear offline notification when back online
      if (notificationId) {
        toast.dismiss(notificationId);
        setNotificationId(null);
      }
    }
  }, [isOnline, forceSync, lastOfflineNotification, notificationId]);

  return null; // This component only manages notifications
}
