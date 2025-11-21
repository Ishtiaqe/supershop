"use client";

import { useState, useEffect } from "react";
import { Card, Switch, List, message } from "antd";
import { BellOutlined } from "@ant-design/icons";
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
        message.success("Notifications enabled");
        setEnabled(true);
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          // Optionally call backend to remove subscription from DB
          message.success("Notifications disabled");
          setEnabled(false);
        }
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to update notification settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <span>
          <BellOutlined className="mr-2" /> Notification Settings
        </span>
      }
      className="shadow-sm"
    >
      <List>
        <List.Item
          actions={[
            <Switch
              key="notification-switch"
              checked={enabled}
              onChange={handleToggle}
              loading={loading}
            />,
          ]}
        >
          <List.Item.Meta
            title="Push Notifications"
            description="Receive alerts for low stock and expiring items on this device."
          />
        </List.Item>
      </List>
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
