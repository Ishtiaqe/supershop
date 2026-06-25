"use client";

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Select, Card, Statistic, Skeleton } from 'antd';
import { TrendingUp, Wallet, Package, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
}

type Period = 'this_month' | 'last_30' | 'all_time';

const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'all_time', label: 'All Time' },
];

const fmt = (n: number) =>
  (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardSummaryClient() {
  const [period, setPeriod] = useState<Period>('this_month');

  const { data, isLoading } = useQuery<DashboardSummaryType>({
    queryKey: ['dashboard-summary', period],
    queryFn: () => api.get(`/sales/analytics/summary?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const periodSelect = (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Select<Period>
        value={period}
        onChange={(val) => setPeriod(val)}
        options={PERIOD_OPTIONS}
        style={{ width: 144 }}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {periodSelect}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {periodSelect}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            title="Asset Value"
            value={`৳ ${fmt(data.totalAssetValue)}`}
            prefix={<Package className="h-4 w-4" />}
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
    </div>
  );
}
