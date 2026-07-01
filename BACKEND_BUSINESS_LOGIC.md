# Backend Business Logic — Status & Inventory

**Last Updated:** 2026-07-02
**Summary:** The Cloud Run NestJS backend has been deleted. This is a standalone Vite SPA (React 18) that talks directly to Supabase (Postgres + PostgREST + Supabase Auth) via `@supabase/supabase-js`. All business logic previously on the backend now lives in `src/lib/api/routes/*.ts` handlers, called through the local router `src/lib/api.ts` → `src/lib/api/router.ts`. When offline, `src/lib/api-offline.ts` reads/writes IndexedDB directly instead of calling Supabase.

---

## Executive Summary

| Aspect | Status |
|--------|--------|
| **Authentication** | ✅ Migrated to Supabase Auth (frontend-only) |
| **Business Logic** | ✅ Migrated — reimplemented in `src/lib/api/routes/*.ts`, calling Supabase directly |
| **Backend Deleted?** | ✅ YES — `supershop-backend/` no longer exists |
| **VITE_API_URL Needed?** | ❌ NO — no remote API server; frontend talks to Supabase directly |

---

## Authentication (Supabase — DONE)

| Feature | Location | Status |
|---------|----------|--------|
| Login (email/password) | `src/app/login/page.tsx` | ✅ Implemented in frontend |
| Token management | Supabase client (`@supabase/supabase-js`) | ✅ Handled entirely by Supabase, no custom refresh logic |
| Logout | `src/components/auth/AuthProvider.tsx` | ✅ Uses Supabase |
| Protected routes | `src/components/auth/ProtectedRoute.tsx` | ✅ Checks Supabase user |
| User profile lookup | `src/components/auth/AuthProvider.tsx` (`useSupabaseAuth()`) | ✅ Queries `users` table directly via Supabase |

Registration and profile fetch are handled the same way as the rest of the app: route handlers in `src/lib/api/routes/auth.ts` and `users.ts` call Supabase directly. There is no separate backend auth service.

---

## Business Logic (now implemented in this repo)

All items below are implemented as route handlers under `src/lib/api/routes/`, dispatched from `src/lib/api/router.ts`. Each handler calls `supabase.from(...)` / `supabase.rpc(...)` directly — this is the business logic layer now.

### 1. Catalog Management (3 endpoints)

**Implemented in:** `src/lib/api/routes/catalog.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/catalog/products` | GET | List all products | src/app/catalog/page.tsx |
| `/catalog/products` | POST | Create product | src/app/catalog/page.tsx |
| `/catalog/brands` | POST | Create brand | src/app/brands/page.tsx |
| `/catalog/categories` | POST | Create category | src/app/categories/page.tsx |

**Why this logic exists (not just raw CRUD)?**
- Multiple tenants share data but filtered by tenant ID
- Complex filtering and search (SKU, name, type, brand)
- Inventory links via product variants
- Price history tracking

### 2. Inventory Management (2+ endpoints)

**Implemented in:** `src/lib/api/routes/inventory.ts` and `src/lib/api/routes/shortlist.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/inventory` | GET | List inventory items | src/app/inventory/page.tsx |
| `/inventory` | POST | Create inventory item | src/app/inventory/page.tsx |
| `/shortlist/add/{inventoryId}` | POST | Add to shortlist | src/hooks/useShortlist.ts |
| `/shortlist/{inventoryId}/toggle` | POST | Toggle shortlist | src/app/shortlist/page.tsx |

**Why this logic exists (not just raw CRUD)?**
- Multi-tenant scoping (each tenant has separate inventory)
- Variant-to-product relationships
- Batch number & expiry tracking
- Low-stock alerts (shortlist trigger)
- Inventory audits & movements

### 3. Sales Recording (1 endpoint — complex)

**Implemented in:** `src/lib/api/routes/sales-history.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/sales` | GET | List sales | src/app/sales/page.tsx |
| `/sales` | POST | Record sale | src/app/pos/page.tsx |

**Why this logic exists (not just raw CRUD)?**
- **Complex side effects:**
  - Automatically creates `ShortList` entry if quantity < 10
  - Automatically creates `CashBoxEntry` if payment method = CASH
  - Updates inventory quantities
  - Calculates profit & margins
  - Validates stock availability
  - Generates receipt number
- Multi-tenant scoping
- Audit trail for compliance

### 4. Cash Box Management (2 endpoints)

**Implemented in:** `src/lib/api/routes/cashBox.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/cash-box` | GET | List cash box entries | src/app/cash-box/ |
| `/cash-box/entries` | POST | Record transaction | src/app/cash-box/hooks/useCashBoxHooks.ts |

**Why this logic exists (not just raw CRUD)?**
- Financial record keeping
- Balance tracking across days
- Reconciliation & audits
- Multi-tenant isolation
- Permission checks (only managers can modify)

### 5. Expense Tracking (3+ endpoints)

**Implemented in:** `src/lib/api/routes/expenses.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/expenses` | GET | List expenses | src/app/expenses/page.tsx |
| `/expenses` | POST | Create expense | src/app/expenses/hooks/useExpensesHooks.ts |
| `/expenses/categories` | POST | Create category | src/app/expenses/hooks/useExpensesHooks.ts |

**Why this logic exists (not just raw CRUD)?**
- Receipt storage & validation
- Category hierarchy
- Budget tracking
- Tax calculations
- Multi-tenant scoping
- Approval workflows

### 6. Credit Management (2+ endpoints)

**Implemented in:** `src/lib/api/routes/credits.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/credits` | GET | List credit accounts | src/app/credits/ |
| `/credits/{saleId}/payments` | POST | Record payment | src/app/credits/hooks/useCreditsHooks.ts |

**Why this logic exists (not just raw CRUD)?**
- Credit limit enforcement
- Payment history tracking
- Interest calculations
- Aging reports
- Multi-tenant scoping
- Audit trail

### 7. Tenant Management (3+ endpoints)

**Implemented in:** `src/lib/api/routes/tenants.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/tenants` | POST | Create tenant | src/app/admin/tenants/page.tsx |
| `/tenants/setup` | POST | Initial setup | src/app/tenant/setup/page.tsx |
| `/tenants/me` | GET | Get current tenant | AuthProvider (cached) |

**Why this logic exists (not just raw CRUD)?**
- Tenant isolation enforcement
- Multi-tenant schema management
- Subscription tiers
- Usage limits
- Data cleanup on deletion

### 8. Notifications (2+ endpoints)

**Implemented in:** `src/lib/api/routes/notifications.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/notifications/subscribe` | POST | Subscribe to push | src/components/notifications/ |
| `/notifications` | POST | Send notification | (internal) |

**Why this logic exists (not just raw CRUD)?**
- Push notification delivery
- Subscription management
- Message queueing
- Delivery retry logic
- Multi-tenant targeting

### 9. Backup & Import (1 endpoint)

**Implemented in:** `src/lib/api/routes/backup.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/backup/import` | POST | Import backup | src/hooks/useBackupApi.ts |

**Why this logic exists (not just raw CRUD)?**
- Data validation before import
- Conflict resolution
- Transaction safety
- Referential integrity checks
- Audit trail (who imported what when)

### 10. User Management (2+ endpoints)

**Implemented in:** `src/lib/api/routes/users.ts` and `src/lib/api/routes/auth.ts`

| Route (local) | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/users/me` | GET | Current user profile | AuthProvider |
| `/auth/register` | POST | Create user | src/app/admin/tenants/page.tsx |
| `/users/me/change-password` | POST | Change password | src/app/profile/page.tsx |

**Why this logic exists (not just raw CRUD)?**
- Role-based access control (RBAC)
- User lifecycle management
- Password hashing
- Audit logging (who changed what)
- Tenant assignment

---

## Where logic lives now

| Feature | Implemented in | Reason it's non-trivial |
|---------|-----------------|--------------------------|
| Login / token refresh / logout | Supabase Auth client (`@supabase/supabase-js`) | Fully managed, serverless |
| Product CRUD | `src/lib/api/routes/catalog.ts` | Multi-tenant filtering, variants, pricing |
| Inventory CRUD | `src/lib/api/routes/inventory.ts`, `shortlist.ts` | Stock tracking, variants, low-stock alerts |
| Sales recording | `src/lib/api/routes/sales-history.ts` | Side effects (shortlist, cash box), stock validation |
| Cash box | `src/lib/api/routes/cashBox.ts` | Financial records, balance tracking |
| Expenses | `src/lib/api/routes/expenses.ts` | Receipt storage, category hierarchy |
| Credits | `src/lib/api/routes/credits.ts` | Credit limits, payment history, aging |
| Tenants | `src/lib/api/routes/tenants.ts` | Tenant isolation, setup flow |
| Users | `src/lib/api/routes/users.ts`, `auth.ts` | RBAC, lifecycle, tenant assignment |
| Notifications | `src/lib/api/routes/notifications.ts` | Push subscription management |
| Backup/import | `src/lib/api/routes/backup.ts` | Validation, conflict resolution on import |

All of the above run client-side against Supabase (Postgres + PostgREST), scoped manually by `tenantId` in each handler — there is no Postgres RLS yet, so this scoping must stay correct in every handler.

---

## Notes on doing business logic client-side

Since there is no backend, these tradeoffs are accepted as the current architecture rather than points to weigh:
- Validation and tenant scoping happen in the route handlers in this repo, not in a server process — correctness depends on each handler filtering by `tenantId` and not skipping validation.
- Multi-tenant isolation is enforced only by explicit `tenantId` filters in queries (no RLS), so new handlers must follow the existing pattern in `src/lib/api/routes/*.ts`.
- Offline behavior: when offline, `src/lib/api-offline.ts` serves reads/writes from IndexedDB instead of Supabase, and queues mutations for later sync (see `src/lib/offline-queue.ts`, `offline-sync.ts`).

---

## Architecture

```
Frontend (Vite SPA)                    Supabase
├── UI & Routing                       ├── Auth (signup/login/session)
├── Form validation                    ├── Postgres (via PostgREST)
├── src/lib/api/routes/*.ts  ────────► └── supabase.from(...) / supabase.rpc(...)
│   (business logic, tenant scoping)
├── Offline caching (IndexedDB)
├── Optimistic updates
└── UX polish
```

No remote application server exists. `VITE_API_URL`/Cloud Run references are obsolete.

---

## Questions?

Refer to:
- **ARCHITECTURE.md** — Complete system design
- `src/lib/api/router.ts` and `src/lib/api/routes/*.ts` — actual business logic implementation
- `prisma/schema.prisma` (in this repo) — schema/migration source of truth for Supabase Postgres (not used as a runtime ORM)
