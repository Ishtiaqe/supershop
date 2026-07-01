"use client";

import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("Service Worker registered:", swUrl, registration);
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    const toastId = toast(
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">A new version is available.</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              updateServiceWorker(true);
              toast.dismiss(toastId);
            }}
          >
            Update now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.dismiss(toastId)}
          >
            Later
          </Button>
        </div>
      </div>,
      {
        duration: Infinity,
      }
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [needRefresh, updateServiceWorker]);

  return null;
}
