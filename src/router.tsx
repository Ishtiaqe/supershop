import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Shell from '@/components/shell/Shell';

// Critical path — loaded eagerly
import LoginPage from '@/app/login/page';
import RootPage from '@/app/page';
import OfflinePage from '@/app/offline/page';
import AuthCallbackPage from '@/app/auth/callback/page';

// App pages — code split
const DashboardPage = lazy(() => import('@/app/dashboard/page'));
const PosPage = lazy(() => import('@/app/pos/page'));
const SalesPage = lazy(() => import('@/app/sales/page'));
const InventoryPage = lazy(() => import('@/app/inventory/page'));
const CatalogPage = lazy(() => import('@/app/catalog/page'));
const CategoriesPage = lazy(() => import('@/app/categories/page'));
const BrandsPage = lazy(() => import('@/app/brands/page'));
const ExpensesPage = lazy(() => import('@/app/expenses/page'));
const CashBoxPage = lazy(() => import('@/app/cash-box/page'));
const ShortlistPage = lazy(() => import('@/app/shortlist/page'));
const CreditsPage = lazy(() => import('@/app/credits/page'));
const MedicinePage = lazy(() => import('@/app/medicine-database/page'));
const DataManagementPage = lazy(() => import('@/app/data-management/page'));
const ProfilePage = lazy(() => import('@/app/profile/page'));
const TenantSetupPage = lazy(() => import('@/app/tenant/setup/page'));
const AdminTenantsPage = lazy(() => import('@/app/admin/tenants/page'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

function ShellLayout() {
  return (
    <Shell>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Shell>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/offline', element: <OfflinePage /> },
  {
    element: <ShellLayout />,
    children: [
      { path: '/', element: <RootPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/sales', element: <SalesPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/brands', element: <BrandsPage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      { path: '/cash-box', element: <CashBoxPage /> },
      { path: '/shortlist', element: <ShortlistPage /> },
      { path: '/credits', element: <CreditsPage /> },
      { path: '/medicine-database', element: <MedicinePage /> },
      { path: '/data-management', element: <DataManagementPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/tenant/setup', element: <TenantSetupPage /> },
      { path: '/admin/tenants', element: <AdminTenantsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
