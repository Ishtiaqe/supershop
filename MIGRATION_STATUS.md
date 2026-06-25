# Supershop Frontend Migration Status

Live tracking file — updated as work progresses. See full plan at
`~/.claude/plans/as-a-solo-developer-twinkly-pudding.md`.

---

## Decision log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-06-25 | **Vite migration confirmed** | User confirmed no ads will be placed. Vite SPA is fine. |
| 2026-06-25 | **Full antd rip-out → shadcn** | User confirmed aggressive path. |
| 2026-06-25 | **Keep NestJS backend on Cloud Run** | DB already Supabase free tier. Cloud Run min=0, ~$0/mo. Track B deferred. |
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
**Status:** ⬜ Not started

Files to convert (antd `Form.useForm` → shadcn Form + RHF + Zod):
- [ ] `src/app/cash-box/components/AddEntryModal.tsx`
- [ ] `src/app/expenses/components/ExpenseModal.tsx`
- [ ] `src/components/catalog/BrandsClient.tsx`
- [ ] `src/components/catalog/CatalogClient.tsx`
- [ ] `src/components/catalog/CategoriesClient.tsx`

Reference pattern: `src/components/inventory/InventoryClient.tsx` (already RHF+Zod).

### Phase A3 — Replace antd components file-by-file
**Status:** ⬜ Not started

Antd usage surface (from exploration):
- Button × 19 files → shadcn `Button`
- Input × 12 → shadcn `Input`
- Card × 12 → shadcn `Card`
- Table × 9 → TanStack Table + shadcn `Table`
- Modal × 8 → shadcn `Dialog`
- Typography × 7 → native + Tailwind
- Popconfirm × 6 → shadcn `AlertDialog`
- Form × 6 → Phase A2 (done first)
- Alert × 6 → shadcn `Alert`
- Space/List/Tag/Spin/Progress/Empty → flex utils / `Badge` / `Skeleton` / `Progress`
- Shell.tsx: Layout, Sider, Menu, Drawer, Avatar, Dropdown (biggest chunk)

### Phase A4 — Flatten pages to single-file client pages
**Status:** ⬜ Not started

(Partially done by Vite migration — pages are already simpler.)

### Phase A5 — Remove antd + dead-code sweep + bundle verification
**Status:** ⬜ Not started

---

## Track B — Backend collapse
**Status:** ⬜ Deferred (Cloud Run + Supabase already ~$0/mo)

---

## Build verification

Last verified: 2026-06-25

```
npm run type-check  → ✅ 0 errors
npm run build       → ✅ dist/sw.js (56 precache entries), main bundle builds clean
```
