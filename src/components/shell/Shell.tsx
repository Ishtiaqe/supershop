"use client";
// Force rebuild timestamp: 1764941600

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Segmented,
  Drawer,
} from "antd";
import { theme } from "antd";
import { useTheme } from "@/components/providers";
// framer-motion removed from Shell to reduce initial bundle size and improve FCP/LCP
import { NetworkStatus } from "./NetworkStatus";
import api from "@/lib/api";

import {
  MenuOutlined,
  UserOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  InboxOutlined,
  AppstoreOutlined,
  // TagsOutlined,
  ChromeOutlined,
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import NotificationSetup from "@/components/notifications/NotificationSetup";

const { Header, Sider, Content } = Layout;

// Extracted Sidebar component to avoid re-creation on every render
const AppSidebar = ({
  collapsed,
  isMobile,
  setMobileOpen,
  items,
  selectedKey,
  user,
  token,
  onLogout,
}: {
  collapsed: boolean;
  isMobile: boolean;
  setMobileOpen: (open: boolean) => void;
  items: any[];
  selectedKey: string;
  user: any;
  token: any;
  onLogout: () => void;
}) => (
  <div className="flex flex-col h-full">
    {/* Logo Area - Only show 'S' logo in sidebar if collapsed, otherwise name is in header now */}
    <div
      className={`flex items-center justify-center ${
        collapsed ? "p-4" : "p-6"
      }`}
    >
      <div
        className={`rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/30 ${
          collapsed ? "w-8 h-8 text-lg" : "w-10 h-10 text-xl"
        }`}
      >
        S
      </div>
    </div>

    {/* Menu */}
    <div className="flex-1 px-2">
      <Menu
        mode="inline"
        items={items}
        selectedKeys={[selectedKey]}
        style={{ background: "transparent", border: "none" }}
        className="custom-menu"
        onClick={() => isMobile && setMobileOpen(false)}
      />
    </div>

    {/* Footer / User Profile */}
    <div className="p-4 border-t border-border/50">
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            {
              key: "profile",
              label: (
                <Link href="/profile" className="flex items-center gap-2">
                  <UserSwitchOutlined /> Profile
                </Link>
              ),
            },
            {
              type: "divider",
            },
            {
              key: "logout",
              danger: true,
              label: (
                <a onClick={onLogout} className="flex items-center gap-2">
                  <LogoutOutlined /> Sign out
                </a>
              ),
            },
          ],
        }}
      >
        <div
          className={`cursor-pointer flex items-center gap-3 ${
            collapsed ? "p-0 w-10 h-10 justify-center" : "p-2"
          } rounded-lg hover:bg-secondary/50 transition-colors`}
        >
          <Avatar
            style={{
              backgroundColor: token.colorPrimary,
              verticalAlign: "middle",
            }}
            size="large"
          >
            {(user?.fullName || "U")[0]}
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden text-left">
              <span className="font-medium text-sm truncate text-foreground">
                {user?.fullName || "User"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  </div>
);

export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname() || "/";
  const router = useRouter();
  const { token } = theme.useToken();
  const themeContext = useTheme();
  const [tenantName, setTenantName] = useState<string>("SuperShop");

  useEffect(() => {
    function checkWidth() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      } else {
        setCollapsed(false); // Reset collapsed state on mobile as we use Drawer
      }
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    // Load tenant name from localStorage
    const tenantJson = localStorage.getItem("tenant");
    if (tenantJson) {
      try {
        const tenant = JSON.parse(tenantJson);
        if (tenant?.name) {
          setTenantName(tenant.name);
        }
      } catch (error) {
        console.error("Failed to parse tenant data:", error);
      }
    }
  }, []);

  const [user, setUser] = useState<any>(() => {
    if (typeof window === "undefined") return null;
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const items: Array<{
    key: string;
    icon: React.ReactNode;
    label: React.ReactNode;
  }> = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: "/dashboard/pos",
      icon: <ShoppingCartOutlined />,
      label: <Link href="/dashboard/pos">Point of Sale</Link>,
    },
    {
      key: "/dashboard/sales",
      icon: <BarChartOutlined />,
      label: <Link href="/dashboard/sales">Sales History</Link>,
    },
    {
      key: "/dashboard/inventory",
      icon: <InboxOutlined />,
      label: <Link href="/dashboard/inventory">Inventory</Link>,
    },
    {
      key: "/dashboard/catalog",
      icon: <AppstoreOutlined />,
      label: <Link href="/dashboard/catalog">Catalog</Link>,
    },
    {
      key: "/dashboard/medicine-database",
      icon: <MedicineBoxOutlined />,
      label: <Link href="/dashboard/medicine-database">Medicine Database</Link>,
    },
    // {
    //   key: "/dashboard/categories",
    //   icon: <TagsOutlined />,
    //   label: <Link href="/dashboard/categories">Categories</Link>,
    // },
    // {
    //   key: "/dashboard/brands",
    //   icon: <ChromeOutlined />,
    //   label: <Link href="/dashboard/brands">Brands</Link>,
    // },
  ];

  if (user?.role === "SUPER_ADMIN") {
    items.push({
      key: "/admin/tenants",
      icon: <UserOutlined />,
      label: <Link href="/admin/tenants">Tenants</Link>,
    });
  }

  // Active Session Validation
  useEffect(() => {
    // We only validate if we are NOT on a public route.
    // pathname check is redundant due to the early return above, but safe to keep context.
    if (pathname !== "/login" && pathname !== "/register") {
      api
        .get("/users/me")
        .then((resp) => {
          if (!resp.data) {
            throw new Error("No user data");
          }
          // Sync state and localStorage
          setUser(resp.data);
          localStorage.setItem("user", JSON.stringify(resp.data));

          if (resp.data.tenant) {
            localStorage.setItem("tenant", JSON.stringify(resp.data.tenant));
            setTenantName(resp.data.tenant.name);
          }
        })
        .catch(() => {
          // If the check fails (401 or network error on auth check),
          // we assume the session is invalid or expired.
          // However, be careful not to redirect on transient network errors if we want offline support later.
          // For now, assuming standard online-first auth behavior as requested.
          localStorage.removeItem("user");
          localStorage.removeItem("tenant");
          router.replace("/login");
        });
    }
  }, [pathname, router]);

  // If we're on the authentication route (login/register), don't render the shell
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  // choose selected key: exact or longest matching prefix
  const selectedKey = (() => {
    let matched: string | undefined;
    for (const it of items) {
      if (pathname === it.key) return it.key;
      if (pathname.startsWith(it.key + "/")) {
        if (!matched || it.key.length > matched.length) matched = it.key;
      }
    }
    return matched || pathname;
  })();

  // Logout handler
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn(
        "Logout endpoint failed, proceeding to clear local state",
        err
      );
    }
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    await new Promise((resolve) => setTimeout(resolve, 0));
    window.location.href = "/login?logout=true";
  };

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
          className="glass border-r border-border/50"
          style={{
            background: "transparent",
            position: "sticky",
            top: 0,
            height: "100vh",
            zIndex: 50,
          }}
        >
          <AppSidebar
            collapsed={collapsed}
            isMobile={isMobile}
            setMobileOpen={setMobileOpen}
            items={items}
            selectedKey={selectedKey}
            user={user}
            token={token}
            onLogout={handleLogout}
          />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          width={280}
          styles={{
            body: {
              padding: 0,
              background: "hsl(var(--background) / 0.8)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            },
          }}
          closable={false}
        >
          <AppSidebar
            collapsed={collapsed}
            isMobile={isMobile}
            setMobileOpen={setMobileOpen}
            items={items}
            selectedKey={selectedKey}
            user={user}
            token={token}
            onLogout={handleLogout}
          />
        </Drawer>
      )}

      <Layout style={{ background: "transparent" }}>
        <Header
          className="glass sticky top-0 z-40 px-6 flex items-center justify-between"
          style={{
            height: 64,
            background: "transparent", // Handled by glass class
            paddingInline: 24,
          }}
        >
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() =>
                isMobile ? setMobileOpen(true) : setCollapsed(!collapsed)
              }
              style={{
                fontSize: "16px",
                width: 40,
                height: 40,
              }}
            />

            {/* Tenant Name Moved to Header */}
            <div className="font-bold text-xl tracking-tight truncate text-foreground flex items-center gap-2 transition-opacity duration-300">
              {tenantName}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NetworkStatus />
            <Segmented
              size="small"
              options={[
                { label: <ChromeOutlined />, value: "system" },
                { label: <SunOutlined />, value: "light" },
                { label: <MoonOutlined />, value: "dark" },
              ]}
              value={themeContext.mode}
              onChange={(val) =>
                themeContext.setMode(val as "system" | "light" | "dark")
              }
              className="bg-secondary/50"
            />
          </div>
        </Header>
        <NotificationSetup />
        <Content
          style={{
            margin: "24px",
            minHeight: 280,
          }}
        >
          <div key={pathname} className="transition-opacity duration-300">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

// Extracted Sidebar component to avoid re-creation on every render
