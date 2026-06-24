"use client";

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Select, SelectItem, Skeleton } from '@heroui/react';
import { TrendingUp, Wallet, Package, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';

interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
}

type Period = 'this_month' | 'last_30' | 'all_time';

export default function DashboardSummaryClient() {
  const [period, setPeriod] = useState<Period>('this_month');

  const { data, isLoading } = useQuery<DashboardSummaryType>({
    queryKey: ['dashboard-summary', period],
    queryFn: () => api.get(`/sales/analytics/summary?period=${period}`).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Select
            selectedKeys={[period]}
            onSelectionChange={(keys) => setPeriod(Array.from(keys)[0] as Period)}
            size="sm"
            className="w-36"
          >
            <SelectItem key="this_month">This Month</SelectItem>
            <SelectItem key="last_30">Last 30 Days</SelectItem>
            <SelectItem key="all_time">All Time</SelectItem>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat-card stat-card-muted">
              <Skeleton className="rounded-lg" />
              <Skeleton className="w-1/2 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select
          selectedKeys={[period]}
          onSelectionChange={(keys) => setPeriod(Array.from(keys)[0] as Period)}
          size="sm"
          className="w-36"
        >
          <SelectItem key="this_month">This Month</SelectItem>
          <SelectItem key="last_30">Last 30 Days</SelectItem>
          <SelectItem key="all_time">All Time</SelectItem>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-primary space-y-2">
          <div className="flex items-center justify-between text-sm text-primary/90">
            <span>Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-semibold text-primary">৳ {(data.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card stat-card-success space-y-2">
          <div className="flex items-center justify-between text-sm text-success/90">
            <span>Total Profit</span>
            <Wallet className="h-4 w-4 text-success" />
          </div>
          <div className="text-xl font-semibold text-success">৳ {(data.totalProfit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card stat-card-info space-y-2">
          <div className="flex items-center justify-between text-sm text-info/90">
            <span>Asset Value</span>
            <Package className="h-4 w-4 text-info" />
          </div>
          <div className="text-xl font-semibold text-info">৳ {(data.totalAssetValue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card stat-card-warning space-y-2">
          <div className="flex items-center justify-between text-sm text-warning/95">
            <span>Orders</span>
            <ShoppingCart className="h-4 w-4 text-warning" />
          </div>
          <div className="text-xl font-semibold text-warning">{(data.ordersCount ?? 0).toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}
