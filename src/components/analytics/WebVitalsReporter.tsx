"use client";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { onFCP, onLCP, onINP } from "web-vitals";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function normalizeRoute(pathname: string): string {
  if (pathname.startsWith("/sales")) return "/sales";
  if (pathname.startsWith("/dashboard")) return "/dashboard";
  if (pathname.startsWith("/pos")) return "/pos";
  return pathname;
}

export default function WebVitalsReporter() {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = normalizeRoute(pathname);

    const report = (metric: { name: string; id: string; value: number; delta: number }) => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", metric.name, {
          event_category: "Web Vitals",
          event_label: route,
          non_interaction: true,
          value: Math.round(metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
          route,
        });
      }
    };

    onFCP(report);
    onLCP(report);
    onINP(report);
  }, [pathname]);

  return null;
}
