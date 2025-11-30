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
      {/* Client-side summary/fallback (hydrates server skeleton) */}
      <DashboardSummaryClient />

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your shop&apos;s performance.
        </p>
      </div>

      <DashboardCharts />
    </div>
  );
}
