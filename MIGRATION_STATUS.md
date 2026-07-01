# Supershop Frontend Migration Status

Live tracking file — updated as work progresses.

**Current State (2026-07-02):**
- ✅ Track A (Frontend Modernization): **COMPLETE** — Vite SPA + React Router + shadcn/ui
- ✅ Track B (Authentication): **COMPLETE** — Supabase Auth integrated and in use
- ✅ Track B (Backend collapse): **COMPLETE** — `supershop-backend/` (NestJS on Cloud Run) has been deleted; all business logic reimplemented in `src/lib/api/routes/*.ts`, calling Supabase directly
- The migration is done. No backend server exists; the app is a standalone Vite SPA talking directly to Supabase.

---

## Decision log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-06-25 | **Vite migration confirmed** | User confirmed no ads will be placed. Vite SPA is fine. |
| 2026-06-25 | **Full antd rip-out → shadcn** | User confirmed aggressive path. |
| 2026-06-25 | **Initially kept NestJS backend on Cloud Run** | DB already Supabase free tier; Cloud Run min=0, ~$0/mo. Superseded — backend was later fully collapsed and deleted (see Track B below). |
| 2026-06-25 | **injectManifest strategy for PWA** | Keeps existing `src/sw.js` with full workbox control. `manifest: false` since `public/manifest.json` already exists. |

---

## Vite migration — completed

| Task | Status |
|------|--------|
| `index.html` (Vite SPA entry) | ✅ Done |
| `vite.config.ts` (VitePWA injectManifest) | ✅ Done |
| `src/main.tsx`, `src/App.tsx`, `src/router.tsx` | ✅ Done |
| `src/vite-env.d.ts` | ✅ Done |
| `package.json` — remove next/next-pwa, add vite/react-router-dom/idb-keyval/web-vitals | ✅ Done |
| `tsconfig.json` — react-jsx, vite/client types | ✅ Done |
| `capacitor.config.ts` — webDir `out` → `dist` | ✅ Done |
| `.eslintrc.json` — remove eslint-config-next | ✅ Done |
| `postcss.config.cjs`, `tailwind.config.cjs` — renamed for `type:module` | ✅ Done |
| `npm install` — 238 Next.js packages removed | ✅ Done |
| workbox packages installed for `src/sw.js` | ✅ Done |

### Files migrated from Next.js → Vite

| File | Change |
|------|--------|
| `src/components/providers.tsx` | `next/dynamic` → `lazy`, `createSyncStoragePersister` → `createAsyncStoragePersister` + idb-keyval, `import.meta.env.DEV` |
| `src/components/shell/Shell.tsx` | `next/link` → `react-router-dom`, `usePathname`+`useRouter` → `useLocation`+`useNavigate` |
| `src/components/auth/ProtectedRoute.tsx` | `useRouter` → `useNavigate` |
| `src/components/analytics/WebVitalsReporter.tsx` | `useReportWebVitals` → `web-vitals` onFCP/onLCP/onINP |
| `src/components/analytics/DeferredTelemetry.tsx` | `next/dynamic` → `lazy`, `/next` → `/react` for vercel packages |
| `src/components/providers/ItemDetailContext.tsx` | `next/dynamic` → `lazy + Suspense` |
| `src/app/dashboard/Dashboard.client.tsx` | `next/dynamic` → `lazy + Suspense` |
| `src/app/dashboard/page.tsx` | Removed `Metadata` |
| `src/app/page.tsx` | `useRouter` → `useNavigate` |
| `src/app/login/page.tsx` | `useRouter` → `useNavigate` |
| `src/app/auth/callback/page.tsx` | `useSearchParams` from react-router-dom (returns `[params, set]`) |
| `src/app/tenant/setup/page.tsx` | `useRouter` → `useNavigate` |
| `src/app/data-management/page.tsx` | `next/link` → `react-router-dom` Link |
| `src/app/offline/page.tsx` | `next/link` → `react-router-dom` Link |
| `src/app/inventory/page.tsx` | `next/dynamic` → `lazy + Suspense`, removed `Metadata` |
| `src/app/categories/page.tsx` | `next/dynamic` → `lazy + Suspense`, removed `Metadata` |
| `src/app/brands/page.tsx` | `next/dynamic` → `lazy + Suspense`, removed `Metadata` |
| `src/app/catalog/page.tsx` | `next/dynamic` → `lazy + Suspense`, removed `Metadata` |
| `src/app/pos/page.tsx` | Removed `Metadata` |
| `src/app/sales/page.tsx` | Removed `Metadata` |

### Files deleted

| File | Reason |
|------|--------|
| `src/app/layout.tsx` | Next.js root layout — replaced by `src/App.tsx` + `src/main.tsx` |
| `src/app/dashboard/DashboardSummary.server.tsx` | Next.js server component — dead code in Vite |
| `src/app/expenses/layout.tsx` | Next.js layout — no Vite equivalent needed |
| `src/app/cash-box/layout.tsx` | Next.js layout — no Vite equivalent needed |
| `src/components/layout/AppShellGate.tsx` | Next.js specific gate component |
| `src/components/providers/AntdRegistry.tsx` | SSR-only antd registry — unneeded in Vite |
| `src/components/lazy/DashboardClientLoader.tsx` | Dead code |
| `src/app/api/proxy/analytics/summary/route.ts` | Next.js route handler — replaced by direct API calls |
| `next.config.js` | Next.js config |
| `next-env.d.ts` | Next.js env types |

---

## Track A — Frontend modernization

### Phase A1 — Foundations
**Status:** ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| Vite + React Router migration | ✅ Done | Full SPA, lazy-loaded routes, React.lazy replaces next/dynamic everywhere |
| shadcn primitives installed | ✅ Done | 14 components + manual `form.tsx`. Located in `src/components/ui/` |
| IDB async persister | ✅ Done | `createAsyncStoragePersister` + `idb-keyval` in `providers.tsx` |
| `components.json` `rsc: false` | ✅ Done | Not using Next.js server components |
| `npm run type-check` green | ✅ Done | Zero errors |
| `npm run build` green | ✅ Done | Full Vite build + SW injectManifest, 56 precache entries |

### Phase A2 — Forms → RHF + Zod (5 files)
**Status:** ✅ Complete

Files to convert (antd `Form.useForm` → shadcn Form + RHF + Zod):
- [x] `src/app/cash-box/components/AddEntryModal.tsx`
- [x] `src/app/expenses/components/ExpenseModal.tsx`
- [x] `src/components/catalog/BrandsClient.tsx`
- [x] `src/components/catalog/CatalogClient.tsx`
- [x] `src/components/catalog/CategoriesClient.tsx`

Reference pattern: `src/components/inventory/InventoryClient.tsx` (already RHF+Zod).

### Phase A3 — Replace antd components file-by-file
**Status:** ✅ Complete

All Ant Design components (Button, Input, Card, Table, Modal, Typography, Popconfirm, Form, Alert, Space, List, Tag, Spin, Progress, Empty) have been replaced with `shadcn/ui` components and native Tailwind CSS styled elements across all files in the repository.

### Phase A4 — Flatten pages to single-file client pages
**Status:** ✅ Complete

* Route-wrapper files and split `Client` components have been flattened. Client logic has been merged directly into their respective `page.tsx` files:
  * `src/app/categories/page.tsx` (CategoriesClient merged, original deleted)
  * `src/app/brands/page.tsx` (BrandsClient merged, original deleted)
  * `src/app/catalog/page.tsx` (CatalogClient merged, original deleted)
  * `src/app/inventory/page.tsx` (InventoryClient merged, original deleted)
  * `src/app/sales/page.tsx` (SalesClient merged, original deleted)
  * `src/app/pos/page.tsx` (POSClient merged, original deleted)
  * `src/app/medicine-database/page.tsx` (MedicineDatabaseClient merged, original deleted)
  * `src/app/dashboard/page.tsx` (Merged DashboardClient + DashboardSummaryClient, original client files deleted)
* This removes unnecessary dynamic lazy-loading wrappers where direct page-level import or rendering is more performant and maintainable.

### Phase A5 — Remove antd + dead-code sweep + bundle verification
**Status:** ✅ Complete

* Ant Design and Ant Design Icons dependencies removed from `package.json`.
* Global CSS `antd/dist/reset.css` removed from `src/main.tsx`.
* Cleaned up `node_modules` (64 packages removed).
* Verified `npm run type-check` (0 errors) and `npm run build` (successful production build).

---

## Track B — Backend collapse
**Status:** ✅ Complete — `supershop-backend/` (NestJS on Cloud Run) is fully deleted. All business logic now runs client-side against Supabase.

### Prisma schema
**Status:** ✅ Complete

The Prisma schema + migrations were copied into `supershop-frontend/prisma/` (source of truth: `prisma/schema.prisma`). Prisma is used **only** via the CLI (`npx prisma migrate dev`, `prisma generate`) as the schema/migration tool against Supabase Postgres — there is no runtime Prisma client in the app. All data access at runtime goes through `supabase.from(...)` / `supabase.rpc(...)` calls in `src/lib/api/routes/*.ts`.

---

### Authentication (Supabase)
**Status:** ✅ Complete

**Decision:** Vite is a bundler, not a framework — no Next.js route handlers. Auth is handled entirely by **Supabase Auth** (fully managed, serverless), with no backend involved.

**Architecture:**
```
Browser (Vite SPA)
  ↓
Supabase Auth (signup/login/session) + Postgres (via PostgREST)
```

**Implemented:**

| Component | Status | Details |
|-----------|--------|---------|
| `src/lib/supabase.ts` | ✅ Done | Supabase JS client configured |
| `src/components/auth/AuthProvider.tsx` (`useSupabaseAuth()`) | ✅ Done | Auth state + `users` table profile lookup |
| Login page (`src/app/login/page.tsx`) | ✅ Done | Uses Supabase Auth |
| `src/components/auth/ProtectedRoute.tsx` | ✅ Done | Route protection via Supabase user |
| `src/lib/api.ts` | ✅ Done | Local in-process router — no HTTP calls, no JWT injection needed |
| Token refresh | ✅ Done | Handled entirely by the Supabase client (`onAuthStateChange`) |

**Removed (no longer needed):**
- `/src/app/api/v1/*` — Next.js route handlers (removed with the Next.js → Vite migration)
- `/src/server/*` — JWT utilities (removed; Supabase handles this)
- `supershop-backend/` — NestJS backend, deleted entirely

---

## Business logic migration
**Status:** ✅ Complete

All domain business logic (catalog, inventory, sales, cash box, expenses, credits, tenants, notifications, backup/import, users) has been reimplemented as route handlers under `src/lib/api/routes/*.ts`, dispatched via `src/lib/api/router.ts`. Each handler calls Supabase directly and filters by `tenantId` manually (no Postgres RLS yet). See `BACKEND_BUSINESS_LOGIC.md` for the full per-feature breakdown.

Offline support continues to work as before: `src/lib/api-offline.ts` serves IndexedDB reads/writes when offline, with `offline-queue.ts` / `offline-sync.ts` replaying queued mutations once back online.

---

## Plan Document

Architecture details: See [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`SUPABASE_AUTH_SETUP.md`](SUPABASE_AUTH_SETUP.md)

---

## Build verification

Last verified: 2026-06-26

```
npm run type-check  → ✅ 0 errors
npm run build       → ✅ dist/sw.js (49 precache entries), clean build with no warnings
npm run dev         → ✅ Vite dev server starts at http://localhost:3001, no runtime errors
```

### Fixes applied (2026-06-26)

- **Input component ref forwarding** — Wrapped shadcn Input with `React.forwardRef()` to fix RHF integration warning
- **Bundle size warning** — Increased `build.chunkSizeWarningLimit` to 600 kB in vite.config.ts
