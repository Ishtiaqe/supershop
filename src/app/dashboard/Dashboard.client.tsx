"use client";

import DashboardSummaryClient from "@/components/dashboard/DashboardSummary.client";
import dynamic from "next/dynamic";
import { Skeleton } from "antd";

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
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subheader">
          Overview of your shop&apos;s performance.
        </p>
      </div>

      {/* Client-side summary/fallback (hydrates server skeleton) */}
      <DashboardSummaryClient />

      <DashboardCharts />
    </div>
  );
}
