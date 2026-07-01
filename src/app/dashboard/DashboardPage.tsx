"use client";

import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { TrendingUp, Wallet, Package, ShoppingCart, Store, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useTenant } from "@/components/providers/TenantProvider";
import { queryKeys } from "@/components/providers";

// Import shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
  totalInventorySellingValue: number;
}

const fmt = (n: number) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const periodLabel = (period: string) => {
  switch (period) {
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 3 Months";
    default:
      return period;
  }
};

function DashboardSummary({ period }: { period: string }) {
  const label = periodLabel(period);
  const { currentTenantId } = useTenant();

  const { data, isLoading, refetch } = useQuery<DashboardSummaryType>({
    queryKey: ["dashboard-summary", currentTenantId, period],
    queryFn: () => api.get(`/sales-history/analytics/summary?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    enabled: !!currentTenantId,
  });

  // Refetch when tenant ID changes
  useEffect(() => {
    if (currentTenantId) {
      refetch();
    }
  }, [currentTenantId, refetch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-5">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const profitPercentage = data.totalRevenue > 0 
    ? ((data.totalProfit / data.totalRevenue) * 100).toFixed(2)
    : "0.00";

  const stats = [
    {
      title: `Revenue (${label})`,
      value: `৳ ${fmt(data.totalRevenue)}`,
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
    },
    {
      title: `Profit (${label})`,
      value: `৳ ${fmt(data.totalProfit)}`,
      icon: <Wallet className="h-4 w-4 text-emerald-500" />,
    },
    {
      title: `Profit Margin (${label})`,
      value: `${profitPercentage}%`,
      icon: <Wallet className="h-4 w-4 text-green-600" />,
    },
    {
      title: "Current Capital",
      value: `৳ ${fmt(data.totalAssetValue)}`,
      icon: <Package className="h-4 w-4 text-blue-500" />,
    },
    {
      title: "Inventory Selling Value",
      value: `৳ ${fmt(data.totalInventorySellingValue)}`,
      icon: <Store className="h-4 w-4 text-purple-500" />,
    },
    {
      title: `Orders (${label})`,
      value: (data.ordersCount ?? 0).toLocaleString("en-IN"),
      icon: <ShoppingCart className="h-4 w-4 text-amber-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stat.title}
            </CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface GraphDataPoint {
  date: string;
  sales: number;
  profit: number;
  profitPercentage?: number;
}

async function fetchGraphData(period: string): Promise<GraphDataPoint[]> {
  const response = await api.get(`/sales-history/analytics/graphs?period=${period}`);
  return response.data;
}

function DashboardCharts({ period }: { period: string }) {
  const { currentTenantId } = useTenant();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-graphs", currentTenantId, period],
    queryFn: () => fetchGraphData(period),
    enabled: !!currentTenantId,
  });

  // Refetch when tenant ID changes
  useEffect(() => {
    if (currentTenantId) {
      refetch();
    }
  }, [currentTenantId, refetch]);

  // Transform data to include profit percentage
  const chartData = data?.map(point => ({
    ...point,
    profitPercentage: point.sales > 0 ? (point.profit / point.sales) * 100 : 0
  })) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm font-medium">
            No data available for this period
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="transition-opacity duration-500">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-4 p-5">
              <CardTitle className="text-lg font-bold">Sales Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value / 1000}k`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Sales",
                      ]}
                      labelFormatter={(label) => formatDate(label)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card) / 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profit Trend Chart */}
        <div className="transition-opacity duration-500 delay-100">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-4 p-5">
              <CardTitle className="text-lg font-bold">Profit Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${value.toFixed(2)}%`,
                        "Profit Margin",
                      ]}
                      labelFormatter={(label) => formatDate(label)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card) / 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="profitPercentage"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");

  const periodSelect = (
    <select
      id="dashboard-period"
      value={period}
      onChange={(e) => setPeriod(e.target.value)}
      className="flex h-10 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="7d">Last 7 Days</option>
      <option value="30d">Last 30 Days</option>
      <option value="90d">Last 3 Months</option>
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {periodSelect}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Summary</h3>
        </div>
        <DashboardSummary period={period} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Analytics</h3>
        </div>
        <DashboardCharts period={period} />
      </section>
    </div>
  );
}
