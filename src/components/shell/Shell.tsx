"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Button, Avatar, Dropdown, Segmented } from "antd";
import { theme } from "antd";
import { useTheme } from "@/components/providers";

import {
  MenuOutlined,
  FileTextOutlined,
  UserOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  ChromeOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { token } = theme.useToken();
  const themeContext = useTheme();
  const [tenantName, setTenantName] = useState<string>("SuperShop");

  useEffect(() => {
    function checkWidth() {
      setCollapsed(window.innerWidth < 768);
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

  // Determine if dark mode is active
  const prefersDark =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  const isDark =
    themeContext.mode === "dark" ||
    (themeContext.mode === "system" && prefersDark);

  const userJson =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userJson ? JSON.parse(userJson) : null;

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
      key: "/dashboard/inventory",
      icon: <AppstoreOutlined />,
      label: <Link href="/dashboard/inventory">Inventory</Link>,
    },
    {
      key: "/dashboard/pos",
      icon: <ShoppingCartOutlined />,
      label: <Link href="/dashboard/pos">Sales Portal</Link>,
    },
    {
      key: "/dashboard/sales",
      icon: <FileTextOutlined />,
      label: <Link href="/dashboard/sales">Sales History</Link>,
    },
  ];

  if (user && user.role === "SUPER_ADMIN") {
    items.push({
      key: "/admin/tenants",
      icon: <UserOutlined />,
      label: <Link href="/admin/tenants">Tenants</Link>,
    });
  }

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

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        // collapsible
        collapsed={collapsed}
        // onCollapse={setCollapsed}
        breakpoint="md"
        style={{
          background: isDark ? token.colorBgContainer : "#ffffff",
        }}
      >
        <div
          style={{
            color: isDark ? token.colorTextLightSolid : token.colorText,
            background: isDark ? token.colorBgContainer : "#ffffff",
            padding: 16,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Button
            id="sider-toggle"
            data-testid="sider-toggle-button"
            aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            icon={<MenuOutlined />}
          />
        </div>
        <Menu
          mode="inline"
          items={items}
          selectedKeys={[selectedKey]}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "space-between",
            background: token.colorBgElevated,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.25rem",
              color: token.colorText,
            }}
          >
            {tenantName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {user && (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "profile",
                      label: (
                        <a onClick={() => router.push("/profile")}>Profile</a>
                      ),
                    },
                    {
                      key: "logout",
                      label: (
                        <a
                          onClick={() => {
                            localStorage.removeItem("accessToken");
                            localStorage.removeItem("refreshToken");
                            localStorage.removeItem("user");
                            router.push("/login");
                          }}
                        >
                          Sign out
                        </a>
                      ),
                    },
                  ],
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar style={{ backgroundColor: "#1890ff" }}>
                    {(user?.fullName || "U")[0]}
                  </Avatar>
                  <div style={{ color: token.colorText }}>
                    {user?.fullName || user?.email}
                  </div>
                </div>
              </Dropdown>
            )}
            <Segmented
              shape="round"
              options={[
                { label: <ChromeOutlined />, value: "system" },
                { label: <SunOutlined />, value: "light" },
                { label: <MoonOutlined />, value: "dark" },
              ]}
              value={themeContext.mode}
              onChange={(val) =>
                themeContext.setMode(val as "system" | "light" | "dark")
              }
            />
          </div>
        </Header>

        <Content
          style={{
            margin: 16,
            padding: 16,
            background: token.colorBgContainer,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
