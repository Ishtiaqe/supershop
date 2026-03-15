import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brands - SuperShop",
  description: "Manage product brands",
};

const BrandsClient = dynamic(
  () => import("@/components/catalog/BrandsClient"),
  { ssr: false }
);

export default function BrandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Brands
        </h1>
        <p className="text-muted-foreground">Manage product brands</p>
      </div>
      <Card variant="borderless" className="glass-card">
        <BrandsClient />
      </Card>
    </div>
  );
}
