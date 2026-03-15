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
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Card title="Sales history" variant="outlined">
        <SalesClient />
      </Card>
    </div>
  );
}
