import React from "react";
import DashboardOutlined from "@ant-design/icons/DashboardOutlined";
import ShoppingCartOutlined from "@ant-design/icons/ShoppingCartOutlined";
import BarChartOutlined from "@ant-design/icons/BarChartOutlined";
import InboxOutlined from "@ant-design/icons/InboxOutlined";
import AppstoreOutlined from "@ant-design/icons/AppstoreOutlined";
import MedicineBoxOutlined from "@ant-design/icons/MedicineBoxOutlined";
import CheckSquareOutlined from "@ant-design/icons/CheckSquareOutlined";
import DatabaseOutlined from "@ant-design/icons/DatabaseOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import DollarOutlined from "@ant-design/icons/DollarOutlined";
import WalletOutlined from "@ant-design/icons/WalletOutlined";

export interface NavigationItem {
  key: string;
  icon: React.ComponentType<any>;
  label: string;
  roles?: string[];
  children?: NavigationItem[];
}

export const navigationConfig: NavigationItem[] = [
  {
    key: "/dashboard",
    icon: DashboardOutlined as any,
    label: "Dashboard",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/pos",
    icon: ShoppingCartOutlined as any,
    label: "Sales Portal",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/sales",
    icon: BarChartOutlined as any,
    label: "Sales History",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/inventory",
    icon: InboxOutlined as any,
    label: "Inventory",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/catalog",
    icon: AppstoreOutlined as any,
    label: "Catalog",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/medicine-database",
    icon: MedicineBoxOutlined as any,
    label: "Medicine Database",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/shortlist",
    icon: CheckSquareOutlined as any,
    label: "Short List",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/expenses",
    icon: DollarOutlined as any,
    label: "Expenses",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/cash-box",
    icon: WalletOutlined as any,
    label: "Cash Box",
    roles: ["OWNER", "SUPER_ADMIN"],
  },
  {
    key: "/data-management",
    icon: DatabaseOutlined as any,
    label: "Data Management",
    roles: ["OWNER", "SUPER_ADMIN"],
  },
  {
    key: "/admin/tenants",
    icon: UserOutlined as any,
    label: "Tenants",
    roles: ["SUPER_ADMIN"],
  },
];

export function getFilteredNavigation(userRole?: string): NavigationItem[] {
  if (!userRole) return [];

  return navigationConfig.filter(item =>
    !item.roles || item.roles.includes(userRole)
  );
}
