import { Card } from "antd";
import { Metadata } from "next";
import SalesClient from "@/components/sales/SalesClient";

export const metadata: Metadata = {
  title: "Sales History",
  description: "View and analyze sales transactions",
};

export default function SalesPage() {
  return (
    <div className="w-full space-y-4">
      <Card variant="outlined">
        <SalesClient />
      </Card>
    </div>
  );
}
