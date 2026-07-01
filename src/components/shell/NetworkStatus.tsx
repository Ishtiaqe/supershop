"use client";

import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useOffline } from "@/hooks/useOffline";

export function NetworkStatus() {
  const { isOnline, isSyncing, offlineStatus, failedItems } = useOffline();

  if (failedItems.length > 0) {
    return (
      <div
        title={`${failedItems.length} operation(s) failed to sync — see the alert at the bottom of the screen`}
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-none">
          {failedItems.length}
        </span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        title="You are offline. Changes will be saved locally and synced when connection returns."
        className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
      >
        <WifiOff className="h-4 w-4" />
      </div>
    );
  }

  if (isSyncing || offlineStatus.pendingOperations > 0) {
    return (
      <div
        title={
          isSyncing
            ? "Syncing offline changes…"
            : `${offlineStatus.pendingOperations} change(s) waiting to sync`
        }
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {!isSyncing && offlineStatus.pendingOperations > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold leading-none">
            {offlineStatus.pendingOperations}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      title="You are online"
      className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 border border-green-500/20"
    >
      <Wifi className="h-4 w-4" />
    </div>
  );
}
