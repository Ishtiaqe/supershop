import { Metadata } from "next";
import POSPageWrapper from "@/components/pos/POSPageWrapper";

export const metadata: Metadata = {
  title: "Sales Portal",
  description: "Process sales and manage transactions",
};

export default function POSPage() {
  return (
    <div className="w-full space-y-4">
      <POSPageWrapper />
    </div>
  );
}
