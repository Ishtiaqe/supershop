import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Progress } from '@heroui/progress';
import { Button } from '@heroui/button';
import { useOffline } from '@/hooks/useOffline';
import { Trash2, Database } from 'lucide-react';

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
    // Check storage every 5 minutes
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
      // Refresh storage info
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
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const getStatusColorBorder = () => {
    switch (storageInfo.status) {
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      default:
        return 'border-green-500';
    }
  };

  const getAlertBgColor = () => {
    switch (storageInfo.status) {
      case 'error':
        return 'bg-red-50 dark:bg-red-950';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950';
      default:
        return 'bg-blue-50 dark:bg-blue-950';
    }
  };

  const getAlertTextColor = () => {
    switch (storageInfo.status) {
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const getProgressColor = () => {
    switch (storageInfo.status) {
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'success';
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

  const cleanupItems = [
    {
      title: 'Clear Offline Cache',
      description: 'Remove cached API responses and temporary data'
    },
    {
      title: 'Clear IndexedDB',
      description: 'Remove local database (use with caution)'
    },
    {
      title: 'Clear Service Worker Cache',
      description: 'Remove cached static assets'
    }
  ];

  return (
    <>
      <div
        className="fixed bottom-6 left-6 z-[1000] cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div
          className={`flex items-center gap-2 bg-surface px-3 py-2 rounded-md shadow-md border-2 ${getStatusColorBorder()}`}
        >
          <Database className={`w-5 h-5 ${getStatusColor()}`} />
          <span className={`${getStatusColor()} font-semibold`}>
            {Math.round(storageInfo.percentage)}%
          </span>
        </div>
      </div>

      <Modal isOpen={showModal} onOpenChange={setShowModal} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Storage Management
          </ModalHeader>

          <ModalBody className="gap-4">
            {/* Storage Usage Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Storage Usage</h3>
              <Progress
                label={`${Math.round(storageInfo.percentage)}%`}
                value={Math.round(storageInfo.percentage)}
                color={getProgressColor()}
                className="max-w-md"
              />
              <p className="text-sm text-foreground-500">
                {formatBytes(storageInfo.used)} of {formatBytes(storageInfo.available)} used
              </p>
            </div>

            {/* Status Alert */}
            <div
              className={`${getAlertBgColor()} ${getAlertTextColor()} rounded-lg p-3 text-sm border border-current/20`}
            >
              <p className="font-semibold mb-1">Storage Status</p>
              <p>{getStatusMessage()}</p>
            </div>

            {/* Cleanup Actions Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Cleanup Actions</h3>

              <p className="text-sm text-foreground-500">
                Clearing storage will remove cached data, offline queue, and temporary files.
                Your core data will remain intact.
              </p>

              {/* Cleanup Items List */}
              <div className="space-y-2">
                {cleanupItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-2 rounded-lg border border-divider hover:bg-default-50 dark:hover:bg-default-100"
                  >
                    <Trash2 className="w-4 h-4 text-foreground-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-foreground-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="gap-2">
            <Button color="default" variant="light" onPress={() => setShowModal(false)}>
              Close
            </Button>
            <Button
              color="danger"
              startContent={<Trash2 className="w-4 h-4" />}
              isLoading={isCleaning}
              onPress={handleCleanup}
            >
              {isCleaning ? 'Cleaning...' : 'Clear All Storage'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// Hook for programmatic storage monitoring
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
      await refreshStorage(); // Refresh after cleanup
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
