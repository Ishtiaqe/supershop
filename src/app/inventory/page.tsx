import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Management",
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
      <Card>
        <InventoryClient />
      </Card>
    </div>
  );
}
