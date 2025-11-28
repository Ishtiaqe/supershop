import { useContext } from "react";
import { OfflineContext } from "@/components/providers/offline-provider";

export function useOffline() {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error("useOffline must be used within an OfflineProvider");
    }
    return context;
}
