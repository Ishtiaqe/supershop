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
  Drawer,
} from "antd";
import { theme } from "antd";
import { useTheme } from "@/components/providers";
import { getFilteredNavigation } from "@/config/navigation";
import { NetworkStatus } from "./NetworkStatus";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

import MenuOutlined from "@ant-design/icons/MenuOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import DesktopOutlined from "@ant-design/icons/DesktopOutlined";
import SunOutlined from "@ant-design/icons/SunOutlined";
import MoonOutlined from "@ant-design/icons/MoonOutlined";
import LogoutOutlined from "@ant-design/icons/LogoutOutlined";
import UserSwitchOutlined from "@ant-design/icons/UserSwitchOutlined";
import NotificationSetup from "@/components/notifications/NotificationSetup";

const { Header, Sider, Content } = Layout;

// Map path to readable label
const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pos": "Sales Portal",
  "/sales": "Sales History",
  "/inventory": "Inventory",
  "/catalog": "Catalog",
  "/medicine-database": "Medicine Database",
  "/shortlist": "Short List",
  "/expenses": "Expenses",
  "/cash-box": "Cash Box",
  "/data-management": "Data Management",
  "/admin/tenants": "Tenants",
  "/profile": "Profile",
};

// Extracted Sidebar component
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
    {/* Logo Area */}
    <div
      className={`flex items-center ${
        collapsed ? "justify-center px-3 py-4" : "gap-3 px-5 py-4"
      }`}
    >
      <div
        className={`rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md flex-shrink-0 ${
          collapsed ? "w-9 h-9 text-lg" : "w-10 h-10 text-xl"
        }`}
      >
        S
      </div>
      {!collapsed && (
        <span className="font-bold text-lg text-foreground tracking-tight truncate">
          SuperShop
        </span>
      )}
    </div>

    {/* Menu */}
    <div className="flex-1 px-2 overflow-y-auto">
      <Menu
        mode="inline"
        items={items}
        selectedKeys={[selectedKey]}
        style={{
          background: "transparent",
          border: "none",
          fontSize: 15,
        }}
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
          } rounded-lg hover:bg-accent transition-colors`}
        >
          <Avatar
            style={{
              backgroundColor: token.colorPrimary,
              verticalAlign: "middle",
              flexShrink: 0,
            }}
            size={40}
          >
            {(user?.fullName || "U")[0]}
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden text-left">
              <span className="font-semibold text-sm truncate text-foreground">
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

// Theme toggle button group
const ThemeToggle = ({
  mode,
  setMode,
  compact = false,
}: {
  mode: string;
  setMode: (m: "system" | "light" | "dark") => void;
  compact?: boolean;
}) => {
  const options: { value: "system" | "light" | "dark"; icon: React.ReactNode; label: string }[] = [
    { value: "system", icon: <DesktopOutlined />, label: "System" },
    { value: "light", icon: <SunOutlined />, label: "Light" },
    { value: "dark", icon: <MoonOutlined />, label: "Dark" },
  ];
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setMode(opt.value)}
          title={opt.label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-ring ${
            mode === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.icon}
          {!compact && <span className="hidden md:inline">{opt.label}</span>}
        </button>
      ))}
    </div>
  );
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname() || "/";
  const router = useRouter();
  const { token } = theme.useToken();
  const themeContext = useTheme();
  const [tenantName, setTenantName] = useState<string>("SuperShop");
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    function checkWidth() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      } else {
        setCollapsed(false);
      }
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
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

  const navigationItems = getFilteredNavigation(user?.role);

  const items = navigationItems.map((item) => ({
    key: item.key,
    icon: <item.icon style={{ fontSize: 18 }} />,
    label: <Link href={item.key}>{item.label}</Link>,
    style: { height: 48, lineHeight: "48px", display: "flex", alignItems: "center" },
  }));

  useEffect(() => {
    if (pathname !== "/login" && pathname !== "/register") {
      if (!loading && !user) {
        router.push("/login");
      }
    }
  }, [pathname, loading, user]);

  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground text-base">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine active selected key
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

  // Current page label for breadcrumb
  const pageLabel =
    PATH_LABELS[selectedKey] ||
    PATH_LABELS[pathname] ||
    (pathname.replace("/", "").replace(/-/g, " ") || "");

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={64}
          className="glass border-r border-border/50"
          style={{
            background: "transparent",
            position: "sticky",
            top: 0,
            height: "100vh",
            zIndex: 50,
            overflow: "hidden",
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
              background: token.colorBgContainer,
            },
          }}
          closable={false}
        >
          <AppSidebar
            collapsed={false}
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
          className="glass sticky top-0 z-40 flex items-center justify-between"
          style={{
            height: 60,
            background: "transparent",
            paddingInline: 16,
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() =>
                isMobile ? setMobileOpen(true) : setCollapsed(!collapsed)
              }
              style={{ fontSize: "18px", width: 44, height: 44 }}
            />

            {/* Tenant + page breadcrumb */}
            <div className="flex items-center gap-2 text-foreground">
              <span className="font-bold text-lg tracking-tight hidden sm:inline">
                {tenantName}
              </span>
              {pageLabel && (
                <>
                  <span className="text-border hidden sm:inline">/</span>
                  <span className="font-medium text-base text-muted-foreground">
                    {pageLabel}
                  </span>
                </>
              )}
              {/* Mobile: show only page label */}
              <span className="font-bold text-base sm:hidden">
                {pageLabel || tenantName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NetworkStatus />
            <ThemeToggle
              mode={themeContext.mode}
              setMode={themeContext.setMode}
              compact={isMobile}
            />
          </div>
        </Header>
        <NotificationSetup />
        <Content
          style={{
            margin: "20px 24px",
            minHeight: 280,
          }}
        >
          <div key={pathname} className="transition-opacity duration-200">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
