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
    <div className="w-full space-y-4">
      <div>
        <h1 className="page-header">Point of Sale</h1>
        <p className="page-subheader">Process sales and manage transactions</p>
      </div>
      <POSPageWrapper />
    </div>
  );
}
