import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage product categories",
};

const CategoriesClient = dynamic(
  () => import("@/components/catalog/CategoriesClient"),
  { ssr: false }
);

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Categories
        </h1>
        <p className="text-muted-foreground">Manage product categories</p>
      </div>
      <Card variant="borderless" className="glass-card">
        <CategoriesClient />
      </Card>
    </div>
  );
}
