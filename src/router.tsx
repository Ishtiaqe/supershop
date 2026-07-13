import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import Shell from '@/components/shell/Shell';
import { lazyWithRetry, LazyImportErrorBoundary } from '@/components/LazyImportErrorBoundary';

// Critical path — loaded eagerly
import LoginPage from '@/app/login/LoginPage';
import RootPage from '@/app/HomePage';
import OfflinePage from '@/app/offline/OfflinePage';
import AuthCallbackPage from '@/app/auth/callback/AuthCallbackPage';

// App pages — code split with retry + error boundary
const DashboardPage = lazyWithRetry(() => import('@/app/dashboard/DashboardPage'));
const PosPage = lazyWithRetry(() => import('@/app/pos/POSPage'));
const SalesPage = lazyWithRetry(() => import('@/app/sales-history/SalesPage'));
const InventoryPage = lazyWithRetry(() => import('@/app/inventory/InventoryPage'));
const CatalogPage = lazyWithRetry(() => import('@/app/catalog/CatalogPage'));
const CategoriesPage = lazyWithRetry(() => import('@/app/categories/CategoriesPage'));
const BrandsPage = lazyWithRetry(() => import('@/app/brands/BrandsPage'));
const ExpensesPage = lazyWithRetry(() => import('@/app/expenses/ExpensesPage'));
const CashRegisterPage = lazyWithRetry(() => import('@/app/cash-register/CashRegisterPage'));
const ShortlistPage = lazyWithRetry(() => import('@/app/shortlist/ShortListPage'));
const CreditsPage = lazyWithRetry(() => import('@/app/credits/CreditsPage'));
const CustomersPage = lazyWithRetry(() => import('@/app/customers/CustomersPage'));
const MedicinePage = lazyWithRetry(() => import('@/app/medicine-database/MedicineDatabasePage'));
const DataManagementPage = lazyWithRetry(() => import('@/app/data-management/DataManagementPage'));
const ProfilePage = lazyWithRetry(() => import('@/app/profile/ProfilePage'));
const TenantSetupPage = lazyWithRetry(() => import('@/app/tenant/setup/TenantSetupPage'));
const AdminTenantsPage = lazyWithRetry(() => import('@/app/admin/tenants/AdminTenantsPage'));
const ShiftsPage = lazyWithRetry(() => import('@/app/shifts/ShiftsPage'));

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
      <LazyImportErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </LazyImportErrorBoundary>
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
