"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { TrendingUp, Wallet, Package, ShoppingCart, Store } from "lucide-react";
import api from "@/lib/api";

// Import shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
  totalInventorySellingValue: number;
}

const fmt = (n: number) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function DashboardSummary({ period }: { period: string }) {
  const { data, isLoading } = useQuery<DashboardSummaryType>({
    queryKey: ["dashboard-summary", period],
    queryFn: () => api.get(`/sales/analytics/summary?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      title: "Total Revenue",
      value: `৳ ${fmt(data.totalRevenue)}`,
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
    },
    {
      title: "Total Profit",
      value: `৳ ${fmt(data.totalProfit)}`,
      icon: <Wallet className="h-4 w-4 text-emerald-500" />,
    },
    {
      title: "Total Current Capital",
      value: `৳ ${fmt(data.totalAssetValue)}`,
      icon: <Package className="h-4 w-4 text-blue-500" />,
    },
    {
      title: "Total Current Inventory Selling Value",
      value: `৳ ${fmt(data.totalInventorySellingValue)}`,
      icon: <Store className="h-4 w-4 text-purple-500" />,
    },
    {
      title: "Orders",
      value: (data.ordersCount ?? 0).toLocaleString("en-IN"),
      icon: <ShoppingCart className="h-4 w-4 text-amber-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stat.title}
            </CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");

  return (
    <div className="space-y-6">

      <div className="space-y-6">
        <DashboardSummary period={period} />
        <DashboardCharts period={period} onPeriodChange={setPeriod} />
      </div>
    </div>
  );
}
