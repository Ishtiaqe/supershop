import { Metadata } from "next";
import SalesClient from "@/components/sales/SalesClient";

export const metadata: Metadata = {
  title: "Sales History",
  description: "View and analyze sales transactions",
};

export default function SalesPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="page-header">Sales History</h1>
        <p className="page-subheader">
          View and analyze past sales transactions
        </p>
      </div>
      <SalesClient />
    </div>
  );
}
