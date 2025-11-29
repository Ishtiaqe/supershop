import dynamic from "next/dynamic";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Point of Sale - SuperShop",
  description: "Process sales and manage transactions",
};

const POSPageWrapper = dynamic(
  () => import("@/components/pos/POSPageWrapper"),
  { ssr: false }
);

export default function POSPage() {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <POSPageWrapper />
    </div>
  );
}
