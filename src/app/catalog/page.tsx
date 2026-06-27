import { lazy, Suspense } from "react";
import { Skeleton } from "antd";

const CatalogClient = lazy(() => import("@/components/catalog/CatalogClient"));

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Product Catalog</h1>
        <p className="page-subheader">
          Manage your product catalog with variants, pricing, and medicine information
        </p>
      </div>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>
        <CatalogClient />
      </Suspense>
    </div>
  );
}
