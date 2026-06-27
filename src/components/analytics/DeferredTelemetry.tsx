"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics }))
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((m) => ({ default: m.SpeedInsights }))
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
    <Suspense fallback={null}>
      <SpeedInsights />
      <Analytics />
    </Suspense>
  );
}
