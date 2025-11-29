"use client";

import { Card, Statistic, Row, Col, Spin } from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface DashboardStatistics {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
}

interface AssetValue {
  totalAssetValue: number;
}

async function fetchStatistics(): Promise<DashboardStatistics> {
  const response = await api.get(`/sales/statistics/overall`);
  return response.data;
}

async function fetchAssetValue(): Promise<AssetValue> {
  const response = await api.get(`/sales/analytics/asset-value`);
  return response.data;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } =
    useQuery<DashboardStatistics>({
      queryKey: ["dashboard-statistics"],
      queryFn: fetchStatistics,
    });

  const { data: assetValue, isLoading: assetLoading } = useQuery<AssetValue>({
    queryKey: ["dashboard-asset-value"],
    queryFn: fetchAssetValue,
  });

  const isLoading = statsLoading || assetLoading;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your shop&apos;s performance.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <motion.div variants={item}>
              <Card
                variant="borderless"
                className="glass-card hover:shadow-md transition-shadow"
              >
                <Statistic
                  title="Total Revenue"
                  value={stats?.totalRevenue || 0}
                  precision={2}
                  valueStyle={{ color: "hsl(var(--success))" }}
                  prefix={<DollarOutlined />}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  All-time revenue
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div variants={item}>
              <Card
                variant="borderless"
                className="glass-card hover:shadow-md transition-shadow"
              >
                <Statistic
                  title="Total Profit"
                  value={stats?.totalProfit || 0}
                  precision={2}
                  valueStyle={{ color: "hsl(var(--primary))" }}
                  prefix={<TrophyOutlined />}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  All-time profit
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div variants={item}>
              <Card
                variant="borderless"
                className="glass-card hover:shadow-md transition-shadow"
              >
                <Statistic
                  title="Asset Value"
                  value={assetValue?.totalAssetValue || 0}
                  precision={2}
                  valueStyle={{ color: "hsl(var(--primary))" }}
                  prefix={<BankOutlined />}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Current inventory value
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div variants={item}>
              <Card
                variant="borderless"
                className="glass-card hover:shadow-md transition-shadow"
              >
                <Statistic
                  title="Orders"
                  value={stats?.ordersCount || 0}
                  valueStyle={{ color: "hsl(var(--destructive))" }}
                  prefix={<ShoppingOutlined />}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Total completed orders
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>
      )}

      <DashboardCharts />
    </motion.div>
  );
}
