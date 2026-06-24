"use client";
// Force rebuild timestamp: 1764941600

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Drawer, DrawerContent, DrawerBody } from "@heroui/react";
import { useTheme } from "@/components/providers";
import { getFilteredNavigation } from "@/config/navigation";
import { NetworkStatus } from "./NetworkStatus";
import { useAuth } from "@/components/auth/AuthProvider";

import { Menu, Monitor, Sun, Moon, LogOut, User } from "lucide-react";
import NotificationSetup from "@/components/notifications/NotificationSetup";
import AdBanner from "@/components/ads/AdBanner";
import { AD_SLOTS } from "@/config/ads";

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

const AppSidebar = ({
  collapsed,
  isMobile,
  setMobileOpen,
  setCollapsed,
  items,
  selectedKey,
  user,
  onLogout,
}: {
  collapsed: boolean;
  isMobile: boolean;
  setMobileOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  items: any[];
  selectedKey: string;
  user: any;
  onLogout: () => void;
}) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-start px-3 py-4 gap-2">
      <button
        className="flex items-center justify-center font-bold flex-shrink-0 w-9 h-9 text-lg cursor-pointer hover:bg-accent/70 active:bg-accent rounded-lg transition-all duration-200"
        onClick={() => isMobile ? setMobileOpen(false) : setCollapsed?.(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Menu size={18} />
      </button>
      {!collapsed && (
        <span className="font-bold text-lg text-foreground tracking-tight truncate">
          SuperShop
        </span>
      )}
    </div>

    <nav className="flex-1 px-2 overflow-y-auto space-y-1">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.key}
          onClick={() => isMobile && setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            selectedKey === item.key
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent/50"
          }`}
        >
          {item.icon}
          {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
        </Link>
      ))}
    </nav>

    <div className="p-3 border-t border-border/50">
      <Dropdown>
        <DropdownTrigger asChild>
          <button
            className={`cursor-pointer flex items-center gap-3 w-full ${
              collapsed ? "p-0 justify-center h-10" : "p-2"
            } rounded-lg hover:bg-accent/80 active:bg-accent transition-all duration-200`}
            title="User menu"
          >
            <Avatar
              size="sm"
              className="flex-shrink-0"
              name={(user?.fullName || "U")[0]}
            />
            {!collapsed && (
              <div className="flex flex-col overflow-hidden text-left flex-1 min-w-0">
                <span className="font-semibold text-sm truncate text-foreground">
                  {user?.fullName || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            )}
          </button>
        </DropdownTrigger>
        <DropdownMenu aria-label="User menu">
          <DropdownItem key="profile" startContent={<User size={16} />} href="/profile">
            Profile
          </DropdownItem>
          <DropdownItem
            key="logout"
            color="danger"
            startContent={<LogOut size={16} />}
            onPress={onLogout}
          >
            Sign out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  </div>
);

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
    { value: "system", icon: <Monitor size={16} />, label: "System" },
    { value: "light", icon: <Sun size={16} />, label: "Light" },
    { value: "dark", icon: <Moon size={16} />, label: "Dark" },
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
  const themeContext = useTheme();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    function checkWidth() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const navigationItems = getFilteredNavigation(user?.role);

  const items = navigationItems.map((item) => ({
    key: item.key,
    icon: <item.icon size={18} />,
    label: item.label,
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
    <div className="flex h-screen bg-background">
      {!isMobile && (
        <aside
          className={`glass border-r border-border/50 sticky top-0 h-screen z-50 overflow-hidden transition-all duration-200 ${
            drawerCollapse ? "w-16" : "w-60"
          }`}
        >
          <AppSidebar
            collapsed={drawerCollapse}
            isMobile={isMobile}
            setMobileOpen={setMobileOpen}
            setCollapsed={setDrawerCollapsed}
            items={items}
            selectedKey={selectedKey}
            user={user}
            onLogout={handleLogout}
          />
        </aside>
      )}

      <Drawer
        isOpen={mobileOpen}
        onOpenChange={setMobileOpen}
        backdrop="blur"
        size="sm"
        classNames={{
          closeButton: "z-50",
        }}
      >
        <DrawerContent>
          <DrawerBody className="p-0">
            <AppSidebar
              collapsed={false}
              isMobile={isMobile}
              setMobileOpen={setMobileOpen}
              setCollapsed={setDrawerCollapsed}
              items={items}
              selectedKey={selectedKey}
              user={user}
              onLogout={handleLogout}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-border/50 h-16 px-6">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="light"
              onClick={() =>
                isMobile ? setMobileOpen(true) : setDrawerCollapsed(!drawerCollapse)
              }
              className="hover:bg-accent"
            >
              <Menu size={18} />
            </Button>
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
        </header>
        <NotificationSetup />
        <main
          className="flex-1 overflow-y-auto"
          style={{
            padding: isMobile ? "16px" : "24px",
          }}
        >
          <div key={pathname} className="transition-opacity duration-200 flex flex-col h-full">
            {children}
            <AdBanner slotId={AD_SLOTS.globalDashboardFooter} minHeight={90} className="mt-6 flex-shrink-0" />
          </div>
        </main>
      </div>
    </div>
  );
}

