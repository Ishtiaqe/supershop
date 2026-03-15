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
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Card title="Inventory">
        <InventoryClient />
      </Card>
    </div>
  );
}
