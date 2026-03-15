"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Skeleton } from "antd";

const DashboardSummaryClient = dynamic(
  () => import("@/components/dashboard/DashboardSummary.client"),
  {
    loading: () => <Skeleton active paragraph={{ rows: 4 }} />,
    ssr: false,
  }
);

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/DashboardCharts"),
  {
    loading: () => <Skeleton active paragraph={{ rows: 10 }} />,
    ssr: false,
  }
);

export default function DashboardClient() {
  const [showHeavyWidgets, setShowHeavyWidgets] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => setShowHeavyWidgets(true);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(schedule, { timeout: 800 });
      return () => window.cancelIdleCallback(idleId);
    }

    timer = setTimeout(schedule, 250);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subheader">
          Overview of your shop&apos;s performance.
        </p>
      </div>

      {showHeavyWidgets ? (
        <>
          {/* Client-side summary/fallback (hydrates server skeleton) */}
          <DashboardSummaryClient />
          <DashboardCharts />
        </>
      ) : (
        <Skeleton active paragraph={{ rows: 10 }} />
      )}
    </div>
  );
}
