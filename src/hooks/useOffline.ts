import { useContext } from "react";
import { OfflineContext } from "@/components/providers/offline-provider";

export function useOffline() {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        // Return default values during HMR or if context is not available
        return {
            isOnline: true,
            failedItems: [],
            retryFailedItem: async () => {},
            discardFailedItem: async () => {},
        };
    }
    return context;
}
