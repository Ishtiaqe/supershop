"use client";

// Card removed; using raw layout classes to reduce bundle size for critical content
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
}

async function fetchSummary(): Promise<DashboardSummaryType> {
  const res = await api.get('/sales/analytics/summary');
  return res.data;
}

export default function DashboardSummaryClient() {
  const { data } = useQuery<DashboardSummaryType>({
    queryKey: ['dashboard-summary'],
    queryFn: fetchSummary,
    refetchOnWindowFocus: false,
  });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Total Revenue</div>
        <div className="text-xl font-semibold">{data.totalRevenue ?? 0}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Total Profit</div>
        <div className="text-xl font-semibold">{data.totalProfit ?? 0}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Asset Value</div>
        <div className="text-xl font-semibold">{data.totalAssetValue ?? 0}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Orders</div>
        <div className="text-xl font-semibold">{data.ordersCount ?? 0}</div>
      </div>
    </div>
  );
}
