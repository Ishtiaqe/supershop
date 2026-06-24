"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/react";

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-divider space-y-3">
          <Skeleton className="h-4 w-2/3 rounded-lg" />
          <Skeleton className="h-8 w-1/2 rounded-lg" />
          <Skeleton className="h-3 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-divider space-y-3">
          <Skeleton className="h-5 w-1/4 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

const DashboardSummaryClient = dynamic(
  () => import("@/components/dashboard/DashboardSummary.client"),
  {
    loading: () => <SummarySkeleton />,
    ssr: false,
  }
);

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/DashboardCharts"),
  {
    loading: () => <ChartsSkeleton />,
    ssr: false,
  }
);

export default function DashboardClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subheader">
          An overview of your shop&apos;s performance
        </p>
      </div>
      {/* Client-side summary/fallback (hydrates server skeleton) */}
      <DashboardSummaryClient />
      <DashboardCharts />
    </div>
  );
}
