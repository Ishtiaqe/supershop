"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((mod) => mod.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false }
);

export default function DeferredTelemetry() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const activate = () => setEnabled(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(activate, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(activate, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
