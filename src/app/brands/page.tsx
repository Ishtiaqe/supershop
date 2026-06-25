import { lazy, Suspense } from "react";
import { Skeleton } from "antd";

const BrandsClient = lazy(() => import("@/components/catalog/BrandsClient"));

export default function BrandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Brands</h1>
        <p className="text-muted-foreground">Manage product brands</p>
      </div>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
        <BrandsClient />
      </Suspense>
    </div>
  );
}
