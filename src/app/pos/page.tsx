import dynamic from "next/dynamic";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Portal",
  description: "Process sales and manage transactions",
};

const POSPageWrapper = dynamic(
  () => import("@/components/pos/POSPageWrapper"),
  { ssr: false }
);

export default function POSPage() {
  return (
    <div className="w-full space-y-4">
      <POSPageWrapper />
    </div>
  );
}
