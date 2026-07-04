import { useContext } from "react";
import { OfflineContext } from "@/components/providers/offline-provider";

export function useOffline() {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        // Return default values during HMR or if context is not available
        return {
            isOnline: true,
            isSyncing: false,
            lastSyncTime: null,
            offlineStatus: {
                isOnline: true,
                lastOnline: 0,
                syncInProgress: false,
                pendingOperations: 0
            },
            failedItems: [],
            forceSync: async () => {},
            retryFailedItem: async () => {},
            discardFailedItem: async () => {},
            clearStorage: async () => {},
            getStorageUsage: async () => null,
        };
    }
    return context;
}
