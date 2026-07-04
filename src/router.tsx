import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Shell from '@/components/shell/Shell';

// Critical path — loaded eagerly
import LoginPage from '@/app/login/LoginPage';
import RootPage from '@/app/HomePage';
import OfflinePage from '@/app/offline/OfflinePage';
import AuthCallbackPage from '@/app/auth/callback/AuthCallbackPage';

// App pages — code split
const DashboardPage = lazy(() => import('@/app/dashboard/DashboardPage'));
const PosPage = lazy(() => import('@/app/pos/POSPage'));
const SalesPage = lazy(() => import('@/app/sales-history/SalesPage'));
const InventoryPage = lazy(() => import('@/app/inventory/InventoryPage'));
const CatalogPage = lazy(() => import('@/app/catalog/CatalogPage'));
const CategoriesPage = lazy(() => import('@/app/categories/CategoriesPage'));
const BrandsPage = lazy(() => import('@/app/brands/BrandsPage'));
const ExpensesPage = lazy(() => import('@/app/expenses/ExpensesPage'));
const CashRegisterPage = lazy(() => import('@/app/cash-register/CashRegisterPage'));
const ShortlistPage = lazy(() => import('@/app/shortlist/ShortListPage'));
const CreditsPage = lazy(() => import('@/app/credits/CreditsPage'));
const CustomersPage = lazy(() => import('@/app/customers/CustomersPage'));
const MedicinePage = lazy(() => import('@/app/medicine-database/MedicineDatabasePage'));
const DataManagementPage = lazy(() => import('@/app/data-management/DataManagementPage'));
const ProfilePage = lazy(() => import('@/app/profile/ProfilePage'));
const TenantSetupPage = lazy(() => import('@/app/tenant/setup/TenantSetupPage'));
const AdminTenantsPage = lazy(() => import('@/app/admin/tenants/AdminTenantsPage'));
const ShiftsPage = lazy(() => import('@/app/shifts/ShiftsPage'));

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
      { path: '/sales-history', element: <SalesPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/brands', element: <BrandsPage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      { path: '/cash-register', element: <CashRegisterPage /> },
      { path: '/shifts', element: <ShiftsPage /> },
      { path: '/shortlist', element: <ShortlistPage /> },
      { path: '/credits', element: <CreditsPage /> },
      { path: '/customers', element: <CustomersPage /> },
      { path: '/medicine-database', element: <MedicinePage /> },
      { path: '/data-management', element: <DataManagementPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/tenant/setup', element: <TenantSetupPage /> },
      { path: '/admin/tenants', element: <AdminTenantsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
