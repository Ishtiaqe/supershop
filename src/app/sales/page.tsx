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
      <div>
        <h1 className="page-header">Sales History</h1>
        <p className="page-subheader">View and analyze sales transactions</p>
      </div>
      <Card variant="outlined">
        <SalesClient />
      </Card>
    </div>
  );
}
