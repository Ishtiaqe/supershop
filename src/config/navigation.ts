import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Inbox,
  Layers,
  Pill,
  ClipboardList,
  CreditCard,
  DollarSign,
  Wallet,
  Database,
  Users,
  Clock,
} from "lucide-react";

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
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/pos",
    icon: ShoppingCart,
    label: "Sales Portal",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/sales-history",
    icon: BarChart3,
    label: "Sales History",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/inventory",
    icon: Inbox,
    label: "Inventory",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/catalog",
    icon: Layers,
    label: "Catalog",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/medicine-database",
    icon: Pill,
    label: "Medicine Database",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/shortlist",
    icon: ClipboardList,
    label: "Short List",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/credits",
    icon: CreditCard,
    label: "Credits",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/expenses",
    icon: DollarSign,
    label: "Expenses",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/cash-register",
    icon: Wallet,
    label: "Cash Register",
    roles: ["OWNER", "SUPER_ADMIN"],
  },
  {
    key: "/shifts",
    icon: Clock,
    label: "Shifts",
    roles: ["OWNER", "EMPLOYEE", "SUPER_ADMIN"],
  },
  {
    key: "/data-management",
    icon: Database,
    label: "Data Management",
    roles: ["OWNER", "SUPER_ADMIN"],
  },
  {
    key: "/admin/tenants",
    icon: Users,
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
