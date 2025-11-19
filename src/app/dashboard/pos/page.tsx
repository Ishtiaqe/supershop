import dynamic from "next/dynamic";
import { Card } from "antd";

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
