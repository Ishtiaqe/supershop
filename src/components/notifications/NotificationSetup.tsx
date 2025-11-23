"use client";

import { useEffect, useState, startTransition } from "react";
import { Button, message } from "antd";
import { BellOutlined } from "@ant-design/icons";
import api from "@/lib/api";

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BBMc..."; // Replace with real key

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
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

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

  const checkSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      setIsSubscribed(true);
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

      // Allow UI to update before API call
      await new Promise((resolve) => setTimeout(resolve, 0));

      await api.post("/notifications/subscribe", subscription);

      // Use startTransition for state updates
      startTransition(() => {
        setIsSubscribed(true);
      });

      message.success("Notifications enabled!");
    } catch (error) {
      console.error("Failed to subscribe:", error);
      message.error("Failed to enable notifications");
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      message.error("Notifications not supported in this environment");
      return;
    }
    const result = await window.Notification.requestPermission();

    // Use startTransition for state updates
    startTransition(() => {
      setPermission(result);
    });

    if (result === "granted") {
      // Allow UI to update before subscribing
      await new Promise((resolve) => setTimeout(resolve, 0));
      subscribeUser();
    }
  };

  if (permission === "granted" && isSubscribed) {
    return null; // Already set up
  }

  if (permission === "denied") {
    return null; // User blocked, don't pester
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        type="primary"
        shape="round"
        icon={<BellOutlined />}
        onClick={requestPermission}
        className="shadow-lg"
      >
        Enable Notifications
      </Button>
    </div>
  );
}
