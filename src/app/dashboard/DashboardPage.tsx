"use client";

import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { TrendingUp, Wallet, Package, ShoppingCart, Store, Boxes, Loader2, CreditCard, AlertTriangle, CalendarDays, Trophy } from "lucide-react";
import api from "@/lib/api";
import { useTenant } from "@/components/providers/TenantProvider";

// Import shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
  totalInventorySellingValue: number;
  totalInventorySkuCount: number;
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

  const { data: extra } = useQuery<ExtraMetrics[]>({
    queryKey: ["dashboard-extra", currentTenantId],
    queryFn: () => api.get("/dashboard/extra-metrics").then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-5">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Skeleton className="h-9 w-36" />
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
      title: "Current Inventory SKU",
      value: (data.totalInventorySkuCount ?? 0).toLocaleString("en-IN"),
      icon: <Boxes className="h-4 w-4 text-cyan-500" />,
    },
    {
      title: `Orders (${label})`,
      value: (data.ordersCount ?? 0).toLocaleString("en-IN"),
      icon: <ShoppingCart className="h-4 w-4 text-amber-500" />,
    },
    {
      title: "Credit Outstanding",
      value: `৳ ${fmt(extra?.[0]?.credit_outstanding || 0)}`,
      icon: <CreditCard className="h-4 w-4 text-orange-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {stat.title}
            </CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
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

  const avgSales = chartData.length > 0
    ? chartData.reduce((sum, p) => sum + p.sales, 0) / chartData.length
    : 0;
  const avgProfitPercentage = chartData.length > 0
    ? chartData.reduce((sum, p) => sum + (p.profitPercentage || 0), 0) / chartData.length
    : 0;

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
                    <ReferenceLine
                      y={avgSales}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                      label={{ value: `Avg: ${formatCurrency(avgSales)}`, position: "insideTopRight", fontSize: 11, fill: "hsl(var(--destructive))" }}
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
                    <ReferenceLine
                      y={avgProfitPercentage}
                      stroke="#15803d"
                      strokeDasharray="4 4"
                      label={{ value: `Avg: ${avgProfitPercentage.toFixed(1)}%`, position: "insideTopRight", fontSize: 11, fill: "#15803d" }}
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

interface ExtraMetrics {
  today_sales: number;
  today_profit: number;
  today_orders: number;
  yesterday_sales: number;
  credit_outstanding: number;
  cash_box_balance: number;
  low_stock_count: number;
}

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

function DashboardExtraMetrics({ period }: { period: string }) {
  const { currentTenantId } = useTenant();
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const { data: extra, isLoading: isLoadingExtra } = useQuery<ExtraMetrics[]>({
    queryKey: ["dashboard-extra", currentTenantId],
    queryFn: () => api.get("/dashboard/extra-metrics").then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    enabled: !!currentTenantId,
  });

  const { data: summary } = useQuery<DashboardSummaryType>({
    queryKey: ["dashboard-summary", currentTenantId, period],
    queryFn: () =>
      api.get(`/sales-history/analytics/summary?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    enabled: !!currentTenantId,
  });

  const e = extra?.[0];
  const avgSales = summary ? summary.totalRevenue / days : 0;
  const avgProfit = summary ? summary.totalProfit / days : 0;
  const avgOrders = summary ? summary.ordersCount / days : 0;

  const pctDiff = (today: number, avg: number) =>
    avg > 0 ? ((today - avg) / avg) * 100 : null;
  const salesDiff = pctDiff(e?.today_sales || 0, avgSales);
  const profitDiff = pctDiff(e?.today_profit || 0, avgProfit);
  const ordersDiff = pctDiff(e?.today_orders || 0, avgOrders);

  const diffLabel = (diff: number | null) => {
    if (diff === null) return "No avg data";
    return `${diff >= 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(1)}% vs avg`;
  };
  const diffColor = (diff: number | null) =>
    diff !== null && diff >= 0 ? "text-emerald-600" : "text-red-500";

  if (isLoadingExtra) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm border-border/60">
            <CardHeader className="p-5 pb-2"><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="p-5 pt-0"><Skeleton className="h-9 w-32" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Sales",
      value: `৳ ${fmt(e?.today_sales || 0)}`,
      sub: diffLabel(salesDiff),
      sub2: `Daily avg (${periodLabel(period)}): ৳${fmt(avgSales)}`,
      icon: <CalendarDays className="h-4 w-4 text-blue-500" />,
      subColor: diffColor(salesDiff),
    },
    {
      title: "Today's Profit",
      value: `৳ ${fmt(e?.today_profit || 0)}`,
      sub: diffLabel(profitDiff),
      sub2: `Daily avg (${periodLabel(period)}): ৳${fmt(avgProfit)}`,
      icon: <Wallet className="h-4 w-4 text-emerald-500" />,
      subColor: diffColor(profitDiff),
    },
    {
      title: "Today's Orders",
      value: (e?.today_orders || 0).toLocaleString("en-IN"),
      sub: diffLabel(ordersDiff),
      sub2: `Daily avg (${periodLabel(period)}): ${Math.round(avgOrders).toLocaleString("en-IN")} orders`,
      icon: <ShoppingCart className="h-4 w-4 text-amber-500" />,
      subColor: diffColor(ordersDiff),
    },
    {
      title: "Cash Register",
      value: `৳ ${fmt(e?.cash_box_balance || 0)}`,
      sub: "Current balance",
      icon: <Wallet className="h-4 w-4 text-purple-500" />,
      subColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat, i) => (
          <Card key={i} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-5">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className={`text-sm mt-1 ${stat.subColor}`}>{stat.sub}</div>
              {stat.sub2 && <div className="text-sm mt-1 text-muted-foreground">{stat.sub2}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {e?.low_stock_count != null && Number(e.low_stock_count) > 0 && (
        <Card className="shadow-sm border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-amber-700">{Number(e.low_stock_count)} items</span>
              <span className="text-muted-foreground"> are running low on stock (≤20 units). Check the Shortlist for details.</span>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function DashboardTopProducts({ period }: { period: string }) {
  const { currentTenantId } = useTenant();
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const { data: topProducts, isLoading: isLoadingTop } = useQuery<TopProduct[]>({
    queryKey: ["dashboard-top-products", currentTenantId, period],
    queryFn: () => api.get(`/dashboard/top-products?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    enabled: !!currentTenantId,
  });

  // Reset pagination when period changes
  useEffect(() => {
    setCurrentPage(1);
  }, [period]);

  const sortedTopProducts = [...(topProducts || [])].sort(
    (a, b) => Number(b.total_profit) - Number(a.total_profit)
  );
  const totalPages = Math.ceil(sortedTopProducts.length / PAGE_SIZE);
  const paginatedProducts = sortedTopProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="p-5 pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Products ({periodLabel(period)})
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoadingTop ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : paginatedProducts.length > 0 ? (
          <div className="divide-y divide-border">
            {paginatedProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {(currentPage - 1) * PAGE_SIZE + i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.product_name}</div>
                    <div className="text-xs text-muted-foreground">{Number(p.total_quantity)} units sold</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-emerald-600">৳{fmt(Number(p.total_profit))} profit</div>
                  <div className="text-xs text-muted-foreground">৳{fmt(Number(p.total_revenue))} revenue</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No sales data for this period</div>
        )}
      </CardContent>
    </Card>
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
          <h3 className="text-base font-semibold text-foreground">Today's Overview</h3>
        </div>
        <DashboardExtraMetrics period={period} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Summary</h3>
        </div>
        <DashboardSummary period={period} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Top Products</h3>
        </div>
        <DashboardTopProducts period={period} />
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
