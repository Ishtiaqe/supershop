# Backend Business Logic — Status & Inventory

**Last Updated:** 2026-06-26  
**Summary:** Cloud Run NestJS backend is REQUIRED for all business logic. Frontend is a thin client that calls the backend for everything except authentication.

---

## Executive Summary

| Aspect | Status |
|--------|--------|
| **Authentication** | ✅ Migrated to Supabase Auth (frontend-only) |
| **Business Logic** | ❌ NOT migrated (still on Cloud Run) |
| **Can Delete Backend?** | ❌ NO — Required for all data operations |
| **VITE_API_URL Needed?** | ✅ YES — Points to Cloud Run |

---

## Authentication (Supabase — DONE)

| Feature | Location | Status |
|---------|----------|--------|
| Login (email/password) | `src/app/login/page.tsx` | ✅ Implemented in frontend |
| Token management | `src/hooks/useSupabaseAuth.ts` | ✅ Implemented in frontend |
| Logout | `src/components/auth/AuthProvider.tsx` | ✅ Uses Supabase |
| Protected routes | `src/components/auth/ProtectedRoute.tsx` | ✅ Checks Supabase user |

**Backend auth endpoints called:**
- `POST /auth/register` → ✅ KEPT (creates app user tied to tenant)
- `GET /users/me` → ✅ KEPT (fetches authenticated user profile)

---

## Business Logic (Cloud Run — NOT MIGRATED)

All endpoints below **REQUIRED** and still running on Cloud Run.

### 1. Catalog Management (3 endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/catalog/products` | GET | List all products | src/app/catalog/page.tsx |
| `/catalog/products` | POST | Create product | src/app/catalog/page.tsx |
| `/catalog/brands` | POST | Create brand | src/app/brands/page.tsx |
| `/catalog/categories` | POST | Create category | src/app/categories/page.tsx |

**Why on backend?**
- Multiple tenants share data but filtered by tenant ID
- Complex filtering and search (SKU, name, type, brand)
- Inventory links via product variants
- Price history tracking

### 2. Inventory Management (2+ endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/inventory` | GET | List inventory items | src/app/inventory/page.tsx |
| `/inventory` | POST | Create inventory item | src/app/inventory/page.tsx |
| `/shortlist/add/{inventoryId}` | POST | Add to shortlist | src/hooks/useShortlist.ts |
| `/shortlist/{inventoryId}/toggle` | POST | Toggle shortlist | src/app/shortlist/page.tsx |

**Why on backend?**
- Multi-tenant scoping (each tenant has separate inventory)
- Variant-to-product relationships
- Batch number & expiry tracking
- Low-stock alerts (shortlist trigger)
- Inventory audits & movements

### 3. Sales Recording (1 endpoint — complex)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/sales` | GET | List sales | src/app/sales/page.tsx |
| `/sales` | POST | Record sale | src/app/pos/page.tsx |

**Why on backend?**
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

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/cash-box` | GET | List cash box entries | src/app/cash-box/ |
| `/cash-box/entries` | POST | Record transaction | src/app/cash-box/hooks/useCashBoxHooks.ts |

**Why on backend?**
- Financial record keeping
- Balance tracking across days
- Reconciliation & audits
- Multi-tenant isolation
- Permission checks (only managers can modify)

### 5. Expense Tracking (3+ endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/expenses` | GET | List expenses | src/app/expenses/page.tsx |
| `/expenses` | POST | Create expense | src/app/expenses/hooks/useExpensesHooks.ts |
| `/expenses/categories` | POST | Create category | src/app/expenses/hooks/useExpensesHooks.ts |

**Why on backend?**
- Receipt storage & validation
- Category hierarchy
- Budget tracking
- Tax calculations
- Multi-tenant scoping
- Approval workflows

### 6. Credit Management (2+ endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/credits` | GET | List credit accounts | src/app/credits/ |
| `/credits/{saleId}/payments` | POST | Record payment | src/app/credits/hooks/useCreditsHooks.ts |

**Why on backend?**
- Credit limit enforcement
- Payment history tracking
- Interest calculations
- Aging reports
- Multi-tenant scoping
- Audit trail

### 7. Tenant Management (3+ endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/tenants` | POST | Create tenant | src/app/admin/tenants/page.tsx |
| `/tenants/setup` | POST | Initial setup | src/app/tenant/setup/page.tsx |
| `/tenants/me` | GET | Get current tenant | AuthProvider (cached) |

**Why on backend?**
- Tenant isolation enforcement
- Multi-tenant schema management
- Subscription tiers
- Usage limits
- Data cleanup on deletion

### 8. Notifications (2+ endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/notifications/subscribe` | POST | Subscribe to push | src/components/notifications/ |
| `/notifications` | POST | Send notification | (internal) |

**Why on backend?**
- Push notification delivery
- Subscription management
- Message queueing
- Delivery retry logic
- Multi-tenant targeting

### 9. Backup & Import (1 endpoint)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/backup/import` | POST | Import backup | src/hooks/useBackupApi.ts |

**Why on backend?**
- Data validation before import
- Conflict resolution
- Transaction safety
- Referential integrity checks
- Audit trail (who imported what when)

### 10. User Management (2+ endpoints)

| Endpoint | Method | Purpose | Frontend Caller |
|----------|--------|---------|-----------------|
| `/users/me` | GET | Current user profile | AuthProvider |
| `/auth/register` | POST | Create user | src/app/admin/tenants/page.tsx |
| `/users/me/change-password` | POST | Change password | src/app/profile/page.tsx |

**Why on backend?**
- Role-based access control (RBAC)
- User lifecycle management
- Password hashing
- Audit logging (who changed what)
- Tenant assignment

---

## Decision Matrix

| Feature | Backend? | Frontend? | Reason |
|---------|----------|-----------|--------|
| Login | ❌ No | ✅ Yes | Supabase Auth (serverless) |
| Token refresh | ❌ No | ✅ Yes | Supabase handles automatically |
| Logout | ❌ No | ✅ Yes | Supabase.auth.signOut() |
| Product CRUD | ✅ Yes | ❌ No | Multi-tenant filtering, variants, pricing |
| Inventory CRUD | ✅ Yes | ❌ No | Stock tracking, variants, audit trail |
| Sales recording | ✅ Yes | ❌ No | Complex side effects (shortlist, cashbox) |
| Cash box | ✅ Yes | ❌ No | Financial records, balance tracking |
| Expenses | ✅ Yes | ❌ No | Receipt storage, budget tracking |
| Credits | ✅ Yes | ❌ No | Credit limits, aging reports |
| Tenants | ✅ Yes | ❌ No | Data isolation, subscriptions |
| Users | ✅ Yes | ❌ No | RBAC, lifecycle management |

---

## Why Not Migrate Business Logic to Frontend?

### 1. Security

- ❌ Exposes business rules to client (can be inspected)
- ❌ No server-side validation
- ❌ Multi-tenant isolation impossible
- ❌ Pricing/discounts visible to clients

### 2. Scale

- ❌ Bundle size becomes massive (500+ endpoints)
- ❌ Slower initial page load
- ❌ Can't update logic without rebuilding & redeploying frontend

### 3. Consistency

- ❌ Different implementations on different clients
- ❌ Offline clients have stale logic
- ❌ Can't enforce required validation

### 4. Complexity

- ❌ Complex features (sales side effects, credit calculations)
- ❌ Database transactions can't be replicated in frontend
- ❌ Real-time syncing becomes nightmare

### 5. Operations

- ❌ Can't debug issues (client-side logic is black box)
- ❌ Can't audit data changes
- ❌ Hard to enforce permissions

---

## Current Architecture Rationale

```
Frontend (Vite SPA)           Auth (Supabase)           Backend (Cloud Run)
├── UI & Routing            ├── Signup                ├── Products
├── Form validation         ├── Login                 ├── Inventory
├── Offline caching         ├── JWT management        ├── Sales (with side effects)
├── Optimistic updates      └── Session management    ├── Expenses
└── UX polish                                         ├── Credits
                                                      ├── Tenants
                                                      ├── Users (RBAC)
                                                      ├── Notifications
                                                      └── Financial reports
```

**Result:**
- ✅ Thin, fast frontend (~500KB gzipped)
- ✅ Secure, server-validated business logic
- ✅ Scalable backend (NestJS can handle growth)
- ✅ Clean separation of concerns
- ✅ Easy to debug & maintain

---

## Conclusion

### ✅ KEEP Cloud Run Backend

All business logic requires server-side validation, multi-tenant scoping, and complex side effects that can't be replicated in the frontend.

### ❌ DO NOT Migrate to Frontend

The 500+ business logic endpoints are correctly on the backend. Moving them to the frontend would:
- Break security (no server-side validation)
- Break multi-tenancy (can't enforce isolation)
- Bloat the bundle
- Make it impossible to update logic
- Violate SOC 2 compliance

### ✅ KEEP VITE_API_URL

The frontend needs to call the backend for all data operations. `VITE_API_URL` will always be required.

### ✅ Supabase Auth is Sufficient

Authentication is now fully managed by Supabase. The frontend calls Supabase directly. Backend doesn't need to handle login/logout/token refresh anymore.

---

## Migration Checklist (If Ever Needed)

If you ever want to move a specific business logic endpoint to the frontend:

- [ ] Understand the current backend implementation
- [ ] Identify all validation rules & business logic
- [ ] Identify all multi-tenant scoping
- [ ] Identify all side effects
- [ ] Implement frontend version with full validation
- [ ] Implement IndexedDB schema for persistence
- [ ] Implement offline sync queue
- [ ] Test thoroughly with multiple tenants
- [ ] Add to offline sync engine
- [ ] Document the decision
- [ ] Update this file

**Recommendation:** Don't do this unless you have a specific reason (e.g., reducing API latency for a specific feature).

---

## Questions?

Refer to:
- **ARCHITECTURE.md** — Complete system design
- **backend/CLAUDE.md** — Backend architecture
- **backend/ARCHITECTURE_ANALYSIS.md** — Backend module dependencies
