# Supabase Auth Implementation Guide

## Overview

The app is a standalone Vite SPA (React 18) that talks directly to Supabase (Postgres + PostgREST + Supabase Auth) via `@supabase/supabase-js`. There is no backend server — the old NestJS backend (`supershop-backend/`) has been fully deleted. Supabase Auth is the sole, complete authentication mechanism:

- ✅ Vite SPA, no Next.js
- ✅ Supabase's managed authentication — no backend needed
- ✅ Session/token refresh handled entirely by the Supabase client (auto-refresh)
- ✅ `src/lib/api.ts` is a local in-process router that dispatches straight to `supabase.from(...)` / `supabase.rpc(...)` calls in `src/lib/api/routes/*.ts`

## Architecture

- `src/components/auth/AuthProvider.tsx` wraps `useSupabaseAuth()` (a hook around the Supabase client's auth session) and layers a `users` table profile fetch on top — looked up by email, falling back to id, falling back to Supabase `user_metadata` if the DB lookup fails.
- Route handlers read `tenantId`/`userId` from local auth state (not a backend-issued JWT) and filter Supabase queries manually — there is currently no Postgres RLS enforcing tenant isolation.

---

## Setup: 3 Steps to Get Working

### Step 1: Add Supabase Credentials to `.env.local`

Open `/mnt/storage/Projects/supershop/supershop-frontend/.env.local` and fill in the ANON_KEY:

```bash
# Supabase Configuration (for authentication)
# Get ANON_KEY from Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://pdfqecwtuytkwkgsygca.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_YOUR_ANON_KEY_HERE
```

**Where to find ANON_KEY:**
1. Go to https://supabase.com/dashboard
2. Select your project (same one as your database)
3. Settings → API → `anon` key → Copy it
4. Paste into `.env.local`

### Step 2: Set Up User Credentials in Supabase Auth

Supabase Auth is managed separately from your PostgreSQL database.

**Option A: Enable Email/Password in Supabase Console**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Email" provider
3. Users table will be auto-created in `auth.users`

**Option B: Manually create users for testing**
```bash
# In Supabase SQL Editor:
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'owner@shop1.com',
  crypt('NFdfp@JP@N75P3J', gen_salt('bf')),
  now(),
  now(),
  now()
)
RETURNING id;
```

**Then create corresponding app user** (link Supabase auth to your users table):
```sql
INSERT INTO public.users (
  id, email, fullName, role, password  -- password can be empty for Supabase auth
) VALUES (
  'USER_ID_FROM_ABOVE',
  'owner@shop1.com',
  'Owner',
  'OWNER',
  ''
);
```

---

## Testing the Flow

### 1. Start Frontend Dev Server
```bash
cd supershop-frontend
npm run dev
# Server runs on http://localhost:3001
```

### 2. Log in with test credentials
- Email: `owner@shop1.com`
- Password: `NFdfp@JP@N75P3J`
- Expected: Login succeeds → redirects to `/pos`

### 3. Verify session is stored
```javascript
// In browser DevTools console:
supabase.auth.getSession().then(r => console.log(r))
// Should output a session containing an access_token starting with "eyJ..."
```

---

## Common Issues & Fixes

### "Missing Supabase environment variables"
**Problem:** VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set  
**Solution:** Add both to `.env.local` (see Step 1 above)

### "Invalid login credentials"
**Problem:** User doesn't exist in Supabase Auth  
**Solution:** Create the user (see Step 2 → Option B)

### Session not found / user logged out unexpectedly
**Problem:** Supabase client couldn't refresh the session  
**Solution:** Check DevTools → Application → Local Storage for the `sb-...-auth-token` key; verify `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are correct

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Browser (Vite SPA)                                  │
├─────────────────────────────────────────────────────┤
│ 1. User fills login form                            │
│ 2. Frontend calls: supabase.auth.signInWithPassword │
│ 3. Supabase returns a session (JWT + refresh token) │
│ 4. Supabase client persists & auto-refreshes it     │
│ 5. src/lib/api.ts route handlers call               │
│    supabase.from(...)/supabase.rpc(...) directly    │
└─────────────────────────────────────────────────────┘
         │
         │ Auth + data requests
         ▼
┌─────────────────────────────────────────────────────┐
│ Supabase (Managed)                                  │
├─────────────────────────────────────────────────────┤
│ - Email/password verification (Supabase Auth)       │
│ - Postgres database via PostgREST                    │
│ - tenantId filtered manually in route handlers       │
│   (no RLS enforcing it yet)                          │
└─────────────────────────────────────────────────────┘
```

---

## Files Involved

| File | Role |
|------|------|
| `src/lib/supabase.ts` | Supabase client |
| `src/hooks/useSupabaseAuth.ts` | Auth state hook (wraps Supabase session) |
| `src/components/auth/AuthProvider.tsx` | Auth context — layers `users` table profile on top of the Supabase session |
| `src/lib/api.ts` | Local in-process router dispatching to `src/lib/api/routes/*.ts` |
| `src/lib/api/routes/*.ts` | Per-domain handlers calling `supabase.from(...)`/`supabase.rpc(...)` |

---

## Debugging

**Check Supabase session:**
```javascript
import { supabase } from '@/lib/supabase'
supabase.auth.getSession().then(r => console.log(r))
```

**Monitor auth state changes:**
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, 'Session:', session)
})
```

**View stored session (DevTools Console):**
```javascript
localStorage.getItem('sb-<project-ref>-auth-token')  // Supabase session data
```

---

## Reference Documentation

Read these files for more context:
1. **ARCHITECTURE.md** — Complete system architecture & data flow
2. **src/hooks/useSupabaseAuth.ts** — Auth hook implementation details
3. **src/components/auth/AuthProvider.tsx** — Auth context using Supabase

---

## Questions?

Refer to:
- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **Implementation:** `src/hooks/useSupabaseAuth.ts`
- **System architecture:** See `ARCHITECTURE.md`
