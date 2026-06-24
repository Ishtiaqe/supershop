"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "@heroui/react";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  if (isOnline) {
    return (
      <Tooltip content="You are online">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success border border-success/20 cursor-help">
          <Wifi size={16} />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="You are offline. Changes will be saved locally.">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive border border-destructive/20 animate-pulse cursor-help">
        <WifiOff size={16} />
      </div>
    </Tooltip>
  );
}
