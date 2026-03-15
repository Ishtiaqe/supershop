import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Management - SuperShop",
  description: "Manage stock levels and batch tracking",
};

const InventoryClient = dynamic(
  () => import("@/components/inventory/InventoryClient"),
  {
    ssr: false,
  }
);

export default function InventoryPage() {
  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="page-header">Inventory</h1>
        <p className="page-subheader">Manage stock levels and batch tracking</p>
      </div>
      <Card>
        <InventoryClient />
      </Card>
    </div>
  );
}
