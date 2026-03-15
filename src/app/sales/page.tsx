import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales History - SuperShop",
  description: "View and analyze sales transactions",
};

const SalesClient = dynamic(() => import("@/components/sales/SalesClient"), {
  ssr: false,
});

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
