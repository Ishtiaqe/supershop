import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Catalog - SuperShop",
  description: "Manage products and variants",
};

const CatalogClient = dynamic(
  () => import("@/components/catalog/CatalogClient"),
  { ssr: false }
);

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Product Catalog
        </h1>
        <p className="text-muted-foreground">
          Manage your product catalog with variants, pricing, and medicine
          information
        </p>
      </div>
      <Card variant="borderless" className="glass-card">
        <CatalogClient />
      </Card>
    </div>
  );
}
