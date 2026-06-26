# SuperShop Frontend Architecture

**Last Updated:** 2026-06-26  
**Status:** Production Ready

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite SPA + React)                      │
│  src/app/* (pages) + src/components/* (UI) + src/lib/* (utilities)  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Authentication Layer (Supabase Auth)                         │   │
│  │  • Login/Logout via Supabase                                │   │
│  │  • JWT stored in localStorage                              │   │
│  │  • useSupabaseAuth hook manages state                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ API Client Layer (axios interceptor)                         │   │
│  │  • Injects Supabase JWT from localStorage                   │   │
│  │  • Handles errors & token expiration                        │   │
│  │  • Falls back to backup API if primary fails                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Data Layer (React Query + IndexedDB)                         │   │
│  │  • Query caching for API responses                          │   │
│  │  • Offline support via IndexedDB                            │   │
│  │  • Background sync queue for offline mutations              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
        ↓                                                   ↓
   Supabase Auth                           Cloud Run NestJS Backend
   (Serverless)                            (Business Logic)
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
            └── Supabase verifies email/password
                └── Returns JWT (access_token)
                    └── useSupabaseAuth stores JWT in localStorage
                        └── Redirect to /pos
```

**Key Points:**
- ✅ Frontend calls Supabase directly (no backend needed)
- ✅ JWT stored in localStorage as `accessToken`
- ✅ Supabase handles all credential verification
- ✅ No refresh tokens needed (Supabase manages expiration)

### API Calls (Authenticated)

```
Component calls api.get() or api.post()
        ↓
src/lib/api.ts (interceptor)
  ├── Reads JWT from localStorage
  ├── Attaches: Authorization: Bearer <jwt>
  └── Sends to Cloud Run NestJS backend
      ↓
Cloud Run validates JWT against Supabase public key
  ├── If valid: Execute business logic (products, sales, inventory, etc.)
  └── If invalid: Return 401 Unauthorized
```

**Key Points:**
- ✅ VITE_API_URL points to Cloud Run (still needed!)
- ✅ API interceptor automatically injects JWT
- ✅ Backend validates JWT as Supabase-issued
- ✅ No backend-based token refresh needed

### Logout (Supabase Auth)

```
User clicks "Logout"
        ↓
Shell.tsx
  └── useAuth().logout()
      └── AuthProvider calls supabase.auth.signOut()
          └── Clears localStorage (accessToken, user, tenant)
              └── Redirect to /login
```

**Key Points:**
- ✅ Uses Supabase logout (cleans up server-side sessions)
- ✅ LocalStorage cleared on client
- ✅ No backend logout call needed

---

## API Endpoints

### Authentication (Supabase, not backend)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | supabase.auth.signInWithPassword() | Email/password login | ✅ Implemented |
| POST | supabase.auth.signOut() | Logout | ✅ Implemented |

### Business Logic (Cloud Run NestJS backend — unchanged)

| Feature | Endpoints | Status |
|---------|-----------|--------|
| **Catalog** | POST /catalog/products, POST /catalog/brands, POST /catalog/categories, GET /catalog/* | ✅ Working |
| **Inventory** | GET /inventory, POST /inventory | ✅ Working |
| **Sales** | GET /sales, POST /sales (with shortlist + cashbox side effects) | ✅ Working |
| **Shortlist** | POST /shortlist/add/*, POST /shortlist/*/toggle | ✅ Working |
| **Cash Box** | GET /cash-box, POST /cash-box/entries | ✅ Working |
| **Expenses** | GET /expenses, POST /expenses, POST /expenses/categories | ✅ Working |
| **Credits** | GET /credits, POST /credits/*/payments | ✅ Working |
| **Tenants** | POST /tenants, POST /tenants/setup, GET /tenants/me | ✅ Working |
| **Notifications** | POST /notifications, POST /notifications/subscribe | ✅ Working |
| **Users** | GET /users/me (fetch current user profile) | ✅ Working |
| **Backup** | POST /backup/import | ✅ Working |

---

## Environment Configuration

### Required Variables

```bash
# Business Logic Backend (Cloud Run NestJS)
VITE_API_URL=https://api.shomaj.one/api/v1

# Authentication (Supabase)
VITE_SUPABASE_URL=https://pdfqecwtuytkwkgsygca.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### Optional Variables

```bash
# Backup API for fallback if primary fails
VITE_API_URL_BACKUP=http://localhost:8000/api/v1

# Analytics
VITE_GA_TRACKING_ID=G-CF5FD8RQF0

# Advertising (optional)
VITE_AD_PROVIDER=both
VITE_ADSENSE_CLIENT_ID=ca-pub-...
```

### Removed Variables

- ❌ `VITE_FIREBASE_*` — Replaced by Supabase Auth
- ❌ Backend auth endpoints — No longer needed

---

## File Organization

### Core Modules

| Path | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/hooks/useSupabaseAuth.ts` | Auth state management |
| `src/lib/api.ts` | API client with JWT interceptor |
| `src/components/auth/AuthProvider.tsx` | Auth context provider (uses Supabase) |
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
- Vite SPA build
- Runs on Vercel Functions (optional, not required)
- Sets `VITE_API_URL` to Cloud Run backend

### Authentication (Supabase)
- Managed service (no deployment needed)
- Handles email/password verification
- Issues JWTs

### Backend (Cloud Run)
- NestJS application
- Validates JWTs from Supabase
- Serves all business logic
- Uses PostgreSQL (Supabase)

---

## Migration Summary

### What Changed (June 26, 2026)

| Item | Before | After | Status |
|------|--------|-------|--------|
| **Authentication** | Firebase + Next.js routes | Supabase Auth (client-side) | ✅ Complete |
| **Frontend Framework** | Next.js 14 App Router | Vite + React Router | ✅ Complete |
| **Token Refresh** | Backend endpoint (`/auth/refresh`) | Supabase (automatic) | ✅ Removed |
| **Token Storage** | httpOnly cookies + localStorage | localStorage only | ✅ Simplified |
| **Logout** | Backend endpoint (`/auth/logout`) | Supabase.auth.signOut() | ✅ Removed |
| **Business Logic** | Still on Cloud Run | Still on Cloud Run (unchanged) | ✅ No change |

### What Stayed the Same

- ✅ Cloud Run NestJS backend (no changes)
- ✅ All business logic endpoints
- ✅ Multi-tenant architecture
- ✅ Offline support (IndexedDB + sync queue)
- ✅ React Query data caching
- ✅ PostgreSQL database (Supabase)

### Removed

- ❌ Next.js route handlers (`/src/app/api/v1/*`)
- ❌ Server-side JWT utilities (`/src/server/*`)
- ❌ Firebase authentication
- ❌ Backend token refresh logic
- ❌ Backend logout logic

---

## Key Insights

### Why Supabase Auth?

1. **Works with Vite** — No need for Next.js
2. **Serverless** — No authentication backend to maintain
3. **Integrated** — Already using Supabase PostgreSQL
4. **Secure** — Built-in JWTs, no custom auth code
5. **Compliant** — Meets security standards (RLS, policies)

### VITE_API_URL Still Needed?

**Yes!** Cloud Run backend is required for:
- All business logic (products, sales, inventory, expenses, etc.)
- Tenant isolation and multi-tenancy
- Complex side effects (shortlist + cashbox on sales)
- Data persistence and validation

The frontend is NOT a backend. It's a client-side app that calls the backend for everything except authentication.

### Why Not Migrate All Backend to Frontend?

Backend business logic is 500+ endpoints across 13 modules. Migrating to frontend would:
1. ❌ Make bundle size massive
2. ❌ Expose business rules to client
3. ❌ Break multi-tenant isolation
4. ❌ Require rewriting complex validation
5. ❌ Eliminate server-side security checks

**Correct architecture:** Thin client + thick server.

---

## Next Steps (If Needed)

### To Migrate More Business Logic to Frontend

**If you ever want to move backend endpoints to the frontend:**
1. Recreate endpoint logic in React/TypeScript
2. Use IndexedDB for persistence
3. Implement offline sync for mutations
4. Add server-side validation before sync
5. Handle conflict resolution

**Current recommendation:** Keep Cloud Run backend as-is. It's free tier ($0/mo) and works well.

### To Scale Backend

If Cloud Run costs grow:
1. Switch to Google App Engine (Flexible)
2. Or Vercel Functions (paid tier)
3. Or self-host on AWS/GCP

### To Enhance Frontend

Recommended additions:
1. ✅ Electron desktop app (same Vite bundle)
2. ✅ React Native mobile (reuse components)
3. ✅ Progressive offline mode (already in code)
4. ✅ Service Worker (already implemented)

---

## Documentation

- **SUPABASE_AUTH_SETUP.md** — Authentication setup guide & troubleshooting
- **MIGRATION_STATUS.md** — Migration progress tracking
- **CLAUDE.md** (parent) — Backend NestJS architecture

---

## Questions?

This is a standard three-tier architecture:
- **Tier 1 (Frontend):** Vite SPA + React + Supabase Auth
- **Tier 2 (Auth):** Supabase Auth (managed)
- **Tier 3 (Backend):** NestJS + PostgreSQL (Cloud Run)

All layers are decoupled and independently deployable.
