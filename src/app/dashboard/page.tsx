import DashboardClient from "./Dashboard.client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your shop's performance",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
