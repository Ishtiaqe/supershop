"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Switch } from "@heroui/react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function NotificationCenter() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setEnabled(!!subscription);
        });
      });
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });
        await api.post("/notifications/subscribe", subscription);
        toast.success("Notifications enabled");
        setEnabled(true);
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          toast.success("Notifications disabled");
          setEnabled(false);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update notification settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={20} />
          <h3 className="font-semibold text-lg">Notification Settings</h3>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-default-200">
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-default-500">Receive alerts for low stock and expiring items on this device.</p>
          </div>
          <Switch
            isSelected={enabled}
            onValueChange={handleToggle}
            isDisabled={loading}
          />
        </div>
      </CardBody>
    </Card>
  );
}

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
