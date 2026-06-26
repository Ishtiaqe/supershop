"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/components/providers";
import { getFilteredNavigation } from "@/config/navigation";
import { NetworkStatus } from "./NetworkStatus";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Monitor,
  Sun,
  Moon,
  LogOut,
  User,
  Menu as MenuIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import NotificationSetup from "@/components/notifications/NotificationSetup";

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
  "/credits": "Credits",
  "/data-management": "Data Management",
  "/admin/tenants": "Tenants",
  "/profile": "Profile",
};

const AppSidebar = ({
  collapsed,
  isMobile,
  setMobileOpen,
  setCollapsed,
  navigationItems,
  selectedKey,
  user,
  onLogout,
}: {
  collapsed: boolean;
  isMobile: boolean;
  setMobileOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  navigationItems: any[];
  selectedKey: string;
  user: any;
  onLogout: () => void;
}) => (
  <div className="flex flex-col h-full bg-background">
    <div className="flex items-center justify-between px-4 py-4 gap-2">
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex items-center justify-center bg-primary text-primary-foreground font-bold rounded-lg w-8.5 h-8.5 flex-shrink-0 text-sm">
          S
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-foreground tracking-tight truncate">
            SuperShop
          </span>
        )}
      </div>
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hidden md:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </Button>
      )}
    </div>

    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = selectedKey === item.key;
        return (
          <Link
            key={item.key}
            to={item.key}
            onClick={() => isMobile && setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>

    <div className="p-3 border-t border-border/50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`w-full text-left cursor-pointer flex items-center gap-3 ${
              collapsed ? "p-0 w-10 h-10 justify-center mx-auto" : "p-2"
            } rounded-lg hover:bg-accent/80 active:bg-accent transition-all duration-200 focus-visible:outline-none`}
            title="User menu"
          >
            <div className="flex items-center justify-center bg-primary text-primary-foreground font-semibold rounded-full w-9 h-9 flex-shrink-0 text-sm">
              {(user?.fullName || "U")[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden text-left min-w-0">
                <span className="font-semibold text-sm truncate text-foreground leading-tight">
                  {user?.fullName || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={collapsed ? "center" : "start"} side="right" className="w-56">
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center gap-2 w-full cursor-pointer">
              <User className="w-4 h-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
    { value: "light", icon: <Sun className="w-4 h-4" />, label: "Light" },
    { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Dark" },
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
              ? "bg-background text-foreground shadow-xs"
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

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const themeContext = useTheme();
  const [tenantName, setTenantName] = useState<string>("SuperShop");
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    function checkWidth() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
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
        if (tenant?.name) setTenantName(tenant.name);
      } catch {}
    }
  }, []);

  // Auth guard — Shell only renders for protected routes
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  const navigationItems = getFilteredNavigation(user?.role);

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
    for (const it of navigationItems) {
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

  void tenantName; // used in future tenant display

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <aside
          className={`glass border-r border-border/50 sticky top-0 h-screen z-50 flex flex-col transition-all duration-300 ${
            drawerCollapse ? "w-16" : "w-60"
          }`}
        >
          <AppSidebar
            collapsed={drawerCollapse}
            isMobile={isMobile}
            setMobileOpen={setMobileOpen}
            setCollapsed={setDrawerCollapsed}
            navigationItems={navigationItems}
            selectedKey={selectedKey}
            user={user}
            onLogout={handleLogout}
          />
        </aside>
      )}

      {/* Sidebar Drawer for Mobile */}
      {isMobile && (
        <>
          {/* Backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
          {/* Drawer content */}
          <aside
            className={`fixed inset-y-0 left-0 w-64 bg-background border-r border-border z-50 md:hidden flex flex-col transform transition-transform duration-300 ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <AppSidebar
              collapsed={false}
              isMobile={isMobile}
              setMobileOpen={setMobileOpen}
              setCollapsed={setDrawerCollapsed}
              navigationItems={navigationItems}
              selectedKey={selectedKey}
              user={user}
              onLogout={handleLogout}
            />
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass sticky top-0 z-40 h-16 flex items-center justify-between border-b border-border/50 px-6 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="hover:bg-accent transition-colors h-10 w-10"
              >
                <MenuIcon className="w-5 h-5" />
              </Button>
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
        </header>

        {/* Content */}
        <NotificationSetup />
        <main
          className={`flex-1 overflow-y-auto ${
            isMobile ? "p-4" : "p-6"
          }`}
        >
          <div key={pathname} className="transition-opacity duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
