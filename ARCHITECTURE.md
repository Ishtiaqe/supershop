# SuperShop Frontend Architecture

**Last Updated:** 2026-07-02  
**Status:** Production Ready

---

## System Architecture

There is no backend server. `supershop-backend/` (NestJS on Cloud Run) has been fully deleted. This is a standalone Vite SPA (React 18 + React Router, not Next.js) that talks directly to Supabase (Postgres + PostgREST + Supabase Auth) via `@supabase/supabase-js`.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite SPA + React)                      │
│  src/app/* (pages) + src/components/* (UI) + src/lib/* (utilities)  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Authentication Layer (Supabase Auth)                         │   │
│  │  • Login/Logout via Supabase                                │   │
│  │  • Session stored/refreshed by the Supabase client           │   │
│  │  • useSupabaseAuth hook manages session state                │   │
│  │  • AuthProvider layers a `users` table profile fetch on top  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ API Layer (src/lib/api.ts — local in-process router)         │   │
│  │  • NOT an HTTP client; no remote backend to call              │   │
│  │  • Dispatches GET/POST/PUT/PATCH/DELETE to lib/api/router.ts │   │
│  │  • router.ts routes to lib/api/routes/*.ts (one per domain)  │   │
│  │  • Each route handler calls supabase.from()/.rpc() directly  │   │
│  │  • GET responses cached in localStorage for 30s               │   │
│  │  • Manual tenantId filtering per handler (no Postgres RLS)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Data Layer (React Query + IndexedDB)                         │   │
│  │  • Query caching for API responses                          │   │
│  │  • Offline: api-offline.ts reads/writes IndexedDB directly,   │   │
│  │    bypassing Supabase entirely when the network is down       │   │
│  │  • Background sync queue replays queued mutations on reconnect│  │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                             ↓
                    Supabase (Postgres + PostgREST + Auth)
```

---

## Authentication Flow

### Login (Supabase Auth)

```
User enters credentials
        ↓
src/app/login/page.tsx
  └── useSupabaseAuth() hook
        └── supabase.auth.signInWithPassword()
            └── Supabase verifies email/password, returns a session
                └── AuthProvider fetches the matching `users` table row
                    (lookup by email, falling back to id, falling back
                    to Supabase user_metadata) to build the app profile
                        └── Redirect to /pos
```

**Key Points:**
- Frontend calls Supabase directly — there is no backend to call
- Supabase client manages the session (access + refresh tokens) internally
- `AuthProvider` layers tenant/role profile data from the `users` table on top of the Supabase session

### API Calls (Authenticated)

```
Component calls api.get() or api.post()
        ↓
src/lib/api.ts — local in-process router (not axios, not HTTP)
  ├── GET: check 30s localStorage cache (skipped for /users/me, /auth/, /backup/, /export/pdf)
  ├── Online → src/lib/api/router.ts
  │     └── routes to src/lib/api/routes/<domain>.ts
  │           └── handler calls supabase.from(...) / supabase.rpc(...) directly
  │                 (filters manually by tenantId from local auth state)
  └── Offline → src/lib/api-offline.ts
        └── reads/writes IndexedDB (src/lib/offline-db.ts) directly, no network call
```

**Key Points:**
- No remote API URL to configure — `api.ts` never leaves the process except via the Supabase client
- Tenant isolation is enforced in application code (each route handler filters by `tenantId`), not by Postgres RLS
- Supabase handles token refresh itself; there is no app-level refresh logic

### Logout (Supabase Auth)

```
User clicks "Logout"
        ↓
Shell.tsx
  └── useAuth().logout()
      └── AuthProvider calls supabase.auth.signOut()
          └── Clears localStorage (cached profile/tenant data)
              └── Redirect to /login
```

**Key Points:**
- Uses Supabase logout (cleans up the Supabase session)
- LocalStorage cleared on client
- No backend logout call — there is no backend

---

## API Endpoints

### Authentication (Supabase)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | supabase.auth.signInWithPassword() | Email/password login | ✅ Implemented |
| POST | supabase.auth.signOut() | Logout | ✅ Implemented |

### Business Logic (local router → Supabase, `src/lib/api/routes/`)

Same `/domain/path` shapes as before, but each is handled in-process by a route file that queries Supabase directly — no network hop to a separate backend.

| Feature | Route file | Endpoints (paths) | Status |
|---------|-----------|-----------|--------|
| **Catalog** | `catalog.ts` | POST /catalog/products, POST /catalog/brands, POST /catalog/categories, GET /catalog/* | ✅ Working |
| **Inventory** | `inventory.ts` | GET /inventory, POST /inventory | ✅ Working |
| **Sales** | `sales-history.ts` | GET /sales, POST /sales (with shortlist + cashbox side effects) | ✅ Working |
| **Shortlist** | `shortlist.ts` | POST /shortlist/add/*, POST /shortlist/*/toggle | ✅ Working |
| **Cash Box** | `cashBox.ts` | GET /cash-box, POST /cash-box/entries | ✅ Working |
| **Expenses** | `expenses.ts` | GET /expenses, POST /expenses, POST /expenses/categories | ✅ Working |
| **Credits** | `credits.ts` | GET /credits, POST /credits/*/payments | ✅ Working |
| **Tenants** | `tenants.ts` | POST /tenants, POST /tenants/setup, GET /tenants/me | ✅ Working |
| **Notifications** | `notifications.ts` | POST /notifications, POST /notifications/subscribe | ✅ Working |
| **Users** | `users.ts` | GET /users/me (fetch current user profile) | ✅ Working |
| **Backup** | `backup.ts` | POST /backup/import | ✅ Working |
| **Export** | `export.ts` | GET /export/pdf | ✅ Working |
| **Auth helpers** | `auth.ts` | local-state helpers used alongside Supabase Auth | ✅ Working |

Side effects that used to be NestJS service coupling (e.g. a sale triggering shortlist checks and a cash-box entry) are now implemented directly inside the relevant route handler (`sales-history.ts`), calling the other domains' Supabase tables/RPCs in the same request.

---

## Environment Configuration

### Required Variables

```bash
# Supabase (Postgres + PostgREST + Auth) — the only backend
VITE_SUPABASE_URL=https://pdfqecwtuytkwkgsygca.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### Optional Variables

```bash
# Analytics
VITE_GA_TRACKING_ID=G-CF5FD8RQF0

# Advertising (optional)
VITE_AD_PROVIDER=both
VITE_ADSENSE_CLIENT_ID=ca-pub-...
```

### Removed Variables

- ❌ `VITE_FIREBASE_*` — Replaced by Supabase Auth
- ❌ `VITE_API_URL` / `VITE_API_URL_BACKUP` — No remote backend exists; `src/lib/api.ts` is a local router, not an HTTP client

---

## File Organization

### Core Modules

| Path | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/hooks/useSupabaseAuth.ts` | Auth state management |
| `src/lib/api.ts` | Local in-process API router + 30s GET cache |
| `src/lib/api/router.ts` | Dispatches to domain route handlers |
| `src/lib/api/routes/*.ts` | One handler file per domain, calls Supabase directly |
| `src/lib/api/utils.ts` | `getLocalStorageData()` and other route-handler helpers (tenantId extraction, etc.) |
| `src/components/auth/AuthProvider.tsx` | Auth context provider (wraps `useSupabaseAuth`, adds `users` table profile) |
| `src/components/auth/ProtectedRoute.tsx` | Route protection wrapper |

### Application Pages

| Path | Feature |
|------|---------|
| `src/app/login/` | Login form (Supabase Auth) |
| `src/app/pos/` | Point of Sale system |
| `src/app/dashboard/` | Analytics dashboard |
| `src/app/inventory/` | Inventory management |
| `src/app/sales/` | Sales history |
| `src/app/catalog/` | Product catalog |
| `src/app/expenses/` | Expense tracking |
| `src/app/cash-box/` | Cash register |
| `src/app/tenant/` | Tenant setup |
| `src/app/admin/` | Admin controls |

### Data & Offline

| Path | Purpose |
|------|---------|
| `src/lib/api-offline.ts` | Offline-aware API wrapper |
| `src/lib/offline-db.ts` | IndexedDB schema |
| `src/lib/offline-queue.ts` | Offline mutation queue |
| `src/lib/offline-sync.ts` | Sync engine |

---

## Deployment

### Frontend (Vercel)
- Vite SPA build, deployed as a static site
- No server-side rendering, no API routes — pure client-side app

### Backend (Supabase, managed)
- Postgres database + PostgREST (auto-generated REST layer used via `@supabase/supabase-js`) + Supabase Auth
- No app server to deploy or scale — Supabase is the entire backend

### Schema / migrations
- `prisma/schema.prisma` (under `supershop-frontend/`, not a separate backend repo) is the schema/migration source of truth
- Migrations applied with the Prisma CLI (`npx prisma migrate dev`) directly against the Supabase Postgres instance
- Prisma is **not** used as a runtime ORM — at runtime all reads/writes go through `supabase-js` (PostgREST), not Prisma Client

---

## History: Migration off NestJS/Cloud Run

The app previously had a separate NestJS backend on Cloud Run that owned all business logic, with the frontend on Next.js. That backend (`supershop-backend/`) has been **fully deleted** from the workspace. The frontend was also migrated off Next.js onto Vite + React Router. Business logic that used to live in NestJS services now lives in `src/lib/api/routes/*.ts`, calling Supabase directly. There is no remaining plan to reintroduce a separate backend server — Supabase (Postgres + PostgREST + Auth) is the permanent data/auth tier.

Multi-tenancy is still enforced by a `tenantId` column on every domain table, but filtering now happens in the route handlers (application code), not in a NestJS guard/service layer, and not via Postgres RLS.

---

## Documentation

- **CLAUDE.md** (parent, `/mnt/storage/Projects/supershop/CLAUDE.md`) — repo-wide guidance; note it may still reference the old backend layout in places and should be read alongside this file.
