import { Metadata } from "next";
import POSClient from "@/components/pos/POSClient";

export const metadata: Metadata = {
  title: "Sales Portal",
  description: "Process sales and manage transactions",
};

export default function POSPage() {
  return <POSClient />;
}
