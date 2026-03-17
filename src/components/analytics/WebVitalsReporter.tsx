"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

type SupportedMetric = "FCP" | "LCP" | "INP";

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
  const pathname = usePathname() || "/";

  useReportWebVitals((metric) => {
    const metricName = metric.name as SupportedMetric;
    if (metricName !== "FCP" && metricName !== "LCP" && metricName !== "INP") {
      return;
    }

    const route = normalizeRoute(pathname);

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", metricName, {
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

    
  });

  return null;
}
