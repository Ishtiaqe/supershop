import { lazy, Suspense } from "react";
import { Skeleton } from "antd";

const CategoriesClient = lazy(() => import("@/components/catalog/CategoriesClient"));

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Categories</h1>
        <p className="text-muted-foreground">Manage product categories</p>
      </div>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
        <CategoriesClient />
      </Suspense>
    </div>
  );
}
