"use client";

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
  return (
    <div className="space-y-6">
      <>
        {/* Client-side summary/fallback (hydrates server skeleton) */}
        <DashboardSummaryClient />
        <DashboardCharts />
      </>
    </div>
  );
}
