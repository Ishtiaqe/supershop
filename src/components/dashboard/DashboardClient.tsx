"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardBody } from "@heroui/react";

function fetchDashboard() {
  return api.get("/tenants/metrics/dashboard").then((res) => res.data);
}

export default function DashboardClient() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  return (
    <>
      {isLoading && <div>Loading metrics…</div>}

      {error && (
        <div className="text-destructive bg-destructive/10 p-2 rounded">
          Unable to load dashboard
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card stat-card-info">
            <CardBody>
              <div className="text-sm text-info/90">Total Sales</div>
              <div className="text-xl font-bold text-info">
                {data.overview?.totalSales ?? 0}
              </div>
            </CardBody>
          </Card>

          <Card className="stat-card stat-card-primary">
            <CardBody>
              <div className="text-sm text-primary/90">Total Revenue</div>
              <div className="text-xl font-bold text-primary">
                ৳{data.overview?.totalRevenue ?? 0}
              </div>
            </CardBody>
          </Card>

          <Card className="stat-card stat-card-success">
            <CardBody>
              <div className="text-sm text-success/90">Inventory Items</div>
              <div className="text-xl font-bold text-success">
                {data.inventory?.totalItems ?? 0}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
