import dynamic from "next/dynamic";
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
    <div className="w-full">
      <InventoryClient />
    </div>
  );
}
