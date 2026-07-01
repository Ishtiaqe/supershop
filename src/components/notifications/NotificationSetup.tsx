"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import api from "@/lib/api";

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BBMc...";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSetup() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "Notification" in window
    ) {
      setPermission(window.Notification.permission);
      checkSubscription();
    }
  }, []);

  // Re-check subscription when permission changes
  useEffect(() => {
    if (permission === "granted") {
      checkSubscription();
    }
  }, [permission]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Failed to check subscription:", error);
    }
  };

  const subscribeUser = async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      await api.post("/notifications/subscribe", subscription);
      setIsSubscribed(true);
      toast.success("Notifications enabled!");
    } catch (error) {
      console.error("Failed to subscribe:", error);
      toast.error("Failed to enable notifications");
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this environment");
      return;
    }

    setIsRequesting(true);
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        await subscribeUser();
      } else if (result === "denied") {
        toast.error("Notification permission denied");
      }
    } catch (error) {
      console.error("Failed to request permission:", error);
      toast.error("Failed to request notification permission");
    } finally {
      setIsRequesting(false);
    }
  };

  // Hide if already subscribed or denied
  if (permission === "granted" && isSubscribed) {
    return null;
  }

  if (permission === "denied") {
    return null;
  }

  // Also hide if permission is granted but subscription failed (user can try again later)
  if (permission === "granted" && !isSubscribed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-4 md:right-4 bottom-20 right-4">
      <Button
        onClick={requestPermission}
        disabled={isRequesting}
        className="shadow-lg rounded-full flex items-center gap-2 h-11 px-5"
      >
        <Bell className="h-4 w-4" />
        {isRequesting ? "Requesting..." : "Enable Notifications"}
      </Button>
    </div>
  );
}
