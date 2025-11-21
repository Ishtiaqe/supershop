import dynamic from "next/dynamic";
import { Card } from "antd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Point of Sale - SuperShop",
  description: "Process sales and manage transactions",
};

const POSClient = dynamic(() => import("@/components/pos/POSClient"), {
  ssr: false,
});

export default function POSPage() {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Card title="Sales Portal">
        <POSClient />
      </Card>
    </div>
  );
}
