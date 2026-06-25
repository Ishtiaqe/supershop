"use client";

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Card, Statistic, Skeleton } from 'antd';
import { TrendingUp, Wallet, Package, ShoppingCart, Store } from 'lucide-react';
import api from '@/lib/api';

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
  totalInventorySellingValue: number;
}

const fmt = (n: number) =>
  (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardSummaryClient({ period }: { period: string }) {
  const { data, isLoading } = useQuery<DashboardSummaryType>({
    queryKey: ['dashboard-summary', period],
    queryFn: () => api.get(`/sales/analytics/summary?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <Statistic
          title="Total Revenue"
          value={`৳ ${fmt(data.totalRevenue)}`}
          prefix={<TrendingUp className="h-4 w-4" />}
        />
      </Card>
      <Card>
        <Statistic
          title="Total Profit"
          value={`৳ ${fmt(data.totalProfit)}`}
          prefix={<Wallet className="h-4 w-4" />}
        />
      </Card>
      <Card>
        <Statistic
          title="Total Current Capital"
          value={`৳ ${fmt(data.totalAssetValue)}`}
          prefix={<Package className="h-4 w-4" />}
        />
      </Card>
      <Card>
        <Statistic
          title="Total Current Inventory Selling Value"
          value={`৳ ${fmt(data.totalInventorySellingValue)}`}
          prefix={<Store className="h-4 w-4" />}
        />
      </Card>
      <Card>
        <Statistic
          title="Orders"
          value={(data.ordersCount ?? 0).toLocaleString('en-IN')}
          prefix={<ShoppingCart className="h-4 w-4" />}
        />
      </Card>
    </div>
  );
}
