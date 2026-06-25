"use client";

import { useState, useEffect } from "react";
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
      <div 
        title="You are online"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 border border-green-500/20"
      >
        <Wifi className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div 
      title="You are offline. Changes will be saved locally."
      className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
    >
      <WifiOff className="h-4 w-4" />
    </div>
  );
}
