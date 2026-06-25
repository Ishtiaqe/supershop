"use client";

import { lazy, Suspense, useState } from "react";
import { Skeleton } from "antd";

const DashboardSummaryClient = lazy(
  () => import("@/components/dashboard/DashboardSummary.client")
);

const DashboardCharts = lazy(
  () => import("@/components/dashboard/DashboardCharts")
);

export default function DashboardClient() {
  const [period, setPeriod] = useState("30d");

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton active paragraph={{ rows: 4 }} />}>
        <DashboardSummaryClient period={period} />
      </Suspense>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>
        <DashboardCharts period={period} onPeriodChange={setPeriod} />
      </Suspense>
    </div>
  );
}
