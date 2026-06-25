"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
  // Single period control shared by summary cards and charts
  const [period, setPeriod] = useState("30d");

  return (
    <div className="space-y-6">
      <DashboardSummaryClient period={period} />
      <DashboardCharts period={period} onPeriodChange={setPeriod} />
    </div>
  );
}
