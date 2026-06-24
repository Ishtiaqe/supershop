import { Metadata } from "next";
import SalesClient from "@/components/sales/SalesClient";

export const metadata: Metadata = {
  title: "Sales History",
  description: "View and analyze sales transactions",
};

export default function SalesPage() {
  return <SalesClient />;
}
