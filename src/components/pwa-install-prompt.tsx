"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { SafeArea } from "@/components/mobile/SafeArea";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const SHOWN_KEY = "pwa-install-shown";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already dismissed or shown before
    if (localStorage.getItem(DISMISS_KEY) || localStorage.getItem(SHOWN_KEY)) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
      localStorage.setItem(SHOWN_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!visible || dismissed) return null;

  return (
    <SafeArea className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary-foreground/10 p-2 rounded-lg shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Install SuperShop</p>
            <p className="text-xs text-primary-foreground/80 truncate">
              Add to home screen for faster access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="h-9 px-3 font-semibold"
            onClick={handleInstall}
          >
            Install
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </SafeArea>
  );
}
