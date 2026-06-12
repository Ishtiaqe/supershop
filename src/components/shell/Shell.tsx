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
import { useAuth } from "@/components/auth/AuthProvider";

import MenuOutlined from "@ant-design/icons/MenuOutlined";
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
  setCollapsed,
  items,
  selectedKey,
  user,
  token,
  onLogout,
}: {
  collapsed: boolean;
  isMobile: boolean;
  setMobileOpen: (open: boolean) => void;
    setCollapsed: (collapsed: boolean) => void;
  items: any[];
  selectedKey: string;
  user: any;
  token: any;
  onLogout: () => void;
}) => (
  <div className="flex flex-col h-full">
    {/* Logo Area */}
    <div
      className={`flex items-center justify-start px-3 py-4 gap-2`}
    >
      <div
        className={`flex items-center justify-center font-bold flex-shrink-0 w-9 h-9 text-lg cursor-pointer hover:bg-accent/70 active:bg-accent rounded-lg transition-all duration-200`}
        onClick={() => isMobile ? setMobileOpen(false) : setCollapsed?.(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <MenuOutlined />
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
          fontSize: 14,
        }}
        className="custom-menu"
        onClick={() => isMobile && setMobileOpen(false)}
      />
    </div>

    {/* Footer / User Profile */}
    <div className="p-3 border-t border-border/50">
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            {
              key: "profile",
              label: (
                <Link href="/profile" className="flex items-center gap-2 px-2 py-1.5">
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
                <a onClick={onLogout} className="flex items-center gap-2 px-2 py-1.5">
                  <LogoutOutlined /> Sign out
                </a>
              ),
            },
          ],
        }}
      >
        <div
          className={`cursor-pointer flex items-center gap-3 ${collapsed ? "p-0 w-10 h-10 justify-center" : "p-2"
            } rounded-lg hover:bg-accent/80 active:bg-accent transition-all duration-200`}
          title="User menu"
        >
          <Avatar
            style={{
              backgroundColor: token.colorPrimary,
              verticalAlign: "middle",
              flexShrink: 0,
            }}
            size={36}
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
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-ring ${mode === opt.value
            ? "bg-background text-foreground"
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
  const [drawerCollapse, setDrawerCollapsed] = useState(true);
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
        setMobileOpen(false);
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
  }, [pathname, loading, user, router]);

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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={drawerCollapse}
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
            collapsed={drawerCollapse}
            isMobile={isMobile}
            setMobileOpen={setMobileOpen}
            setCollapsed={setDrawerCollapsed}
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
              background: "transparent",
            },
          }}
          closable={false}
          maskClosable={true}
        >
          <AppSidebar
            collapsed={false}
            isMobile={isMobile}
            setMobileOpen={setMobileOpen}
            setCollapsed={setDrawerCollapsed}
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
          className="glass sticky top-0 z-40 flex items-center justify-between border-b border-border/50"
          style={{
            height: 64,
            background: "transparent",
            paddingInline: 24,
          }}
        >
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={<MenuOutlined />}
              hidden={!isMobile}
              onClick={() =>
                isMobile ? setMobileOpen(true) : setDrawerCollapsed(!drawerCollapse)
              }
              className="hover:bg-accent transition-colors"
              style={{ fontSize: "18px", width: 40, height: 40, borderRadius: 8 }}
            />
            {!isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerCollapsed(!drawerCollapse)}
                className="hover:bg-accent transition-colors"
                style={{ fontSize: "18px", width: 40, height: 40, borderRadius: 8 }}
              />
            )}
          </div>
          <div className="font-semibold text-lg text-foreground tracking-tight">
            {PATH_LABELS[pathname] || pathname}
          </div>
          <div className="flex items-center gap-2">
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
            minHeight: "calc(100vh - 64px)",
            padding: isMobile ? "16px" : "24px",
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

