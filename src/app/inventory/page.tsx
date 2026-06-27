import { lazy, Suspense } from "react";
import { Skeleton } from "antd";

const InventoryClient = lazy(() => import("@/components/inventory/InventoryClient"));

export default function InventoryPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="page-header">Inventory Management</h1>
        <p className="page-subheader">Manage stock levels, batches, and pricing</p>
      </div>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>
        <InventoryClient />
      </Suspense>
    </div>
  );
}
