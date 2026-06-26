# Supabase Auth Implementation Guide

## Overview

The frontend has been migrated from Firebase Auth to Supabase Auth. This is a simpler, more integrated approach that:

- ✅ Works with Vite SPA (no Next.js required)
- ✅ Uses Supabase's managed authentication (no backend needed)
- ✅ Automatically stores JWT in localStorage for API requests
- ✅ Integrates with the existing Cloud Run NestJS backend

## What Changed

### Removed
- ❌ Next.js route handlers (`/src/app/api/v1/auth/*`)
- ❌ `/src/server/*` helper files (JWT generation, guards, etc.)
- ❌ Firebase Auth dependency (still available but not used for login)

### Added
- ✅ `src/lib/supabase.ts` — Supabase client
- ✅ `src/hooks/useSupabaseAuth.ts` — Auth state management
- ✅ Updated login page to use Supabase Auth
- ✅ Updated ProtectedRoute to use Supabase auth

### Unchanged
- `src/lib/api.ts` — Still reads JWT from localStorage (works as-is)
- `src/components/auth/AuthProvider.tsx` — Can be kept for compatibility
- `prisma/schema.prisma` — Database schema (read-only)

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
  crypt('Owner123!', gen_salt('bf')),
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

### Step 3: Update Backend to Validate Supabase JWT

Your Cloud Run NestJS backend needs to validate tokens from Supabase (not generate them).

**Update `supershop-backend/src/modules/auth/strategies/jwt.strategy.ts`:**

```ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use Supabase's public key (available via JWKS endpoint)
      // For now, we'll use HS256 with a temporary secret — update before production
      secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret',
    })
  }

  async validate(payload: any) {
    // Supabase JWT has these fields:
    // payload.sub = user ID
    // payload.email = user email
    // payload.aud = "authenticated"
    
    // Link to your app's users table by email
    return { userId: payload.sub, email: payload.email }
  }
}
```

**For production (recommended):** Use Supabase's JWKS endpoint to validate without a shared secret:

```ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import * as jwksClient from 'jwks-rsa'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private jwksClient: jwksClient.JwksClient

  constructor() {
    const projectId = process.env.VITE_SUPABASE_URL.split('.')[0] // Extract from URL
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrPublicKey: async (header, callback) => {
        const key = await this.jwksClient.getSigningKey(header.kid)
        callback(null, key.getPublicKey())
      },
    })

    this.jwksClient = jwksClient.default({
      jwksUri: `${process.env.VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    })
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email }
  }
}
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
- Password: `Owner123!`
- Expected: Login succeeds → redirects to `/pos`

### 3. Verify token is stored
```javascript
// In browser DevTools console:
localStorage.getItem('accessToken')
// Should output: JWT token starting with "eyJ..."
```

### 4. Test API call with token
```bash
curl -H "Authorization: Bearer $(node -e 'console.log(localStorage.getItem(\"accessToken\"))')" \
  http://localhost:8000/api/v1/users/me
# Should return authenticated user profile
```

---

## Common Issues & Fixes

### "Missing Supabase environment variables"
**Problem:** VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set  
**Solution:** Add both to `.env.local` (see Step 1 above)

### "Invalid login credentials"
**Problem:** User doesn't exist in Supabase Auth  
**Solution:** Create the user (see Step 2 → Option B)

### "401 Unauthorized on API calls"
**Problem:** Backend can't validate JWT token  
**Solution:** Ensure backend JWT strategy uses correct secret/public key

### Token not stored in localStorage
**Problem:** Login succeeds but token missing  
**Solution:** Check DevTools → Network → login response contains `access_token`

---

## Architecture After Migration

```
┌─────────────────────────────────────────────────────┐
│ Browser (Vite SPA)                                  │
├─────────────────────────────────────────────────────┤
│ 1. User fills login form                            │
│ 2. Frontend calls: supabase.auth.signInWithPassword │
│ 3. Supabase returns JWT                             │
│ 4. Frontend stores JWT in localStorage              │
│ 5. API client attaches: Authorization: Bearer JWT   │
└─────────────────────────────────────────────────────┘
         │
         │ Login request
         ▼
┌─────────────────────────────────────────────────────┐
│ Supabase Auth (Managed)                             │
├─────────────────────────────────────────────────────┤
│ - Email/password verification                       │
│ - JWT generation (HS256)                            │
│ - Session management                                │
└─────────────────────────────────────────────────────┘
         │
         │ API requests with JWT
         ▼
┌─────────────────────────────────────────────────────┐
│ Cloud Run NestJS Backend                            │
├─────────────────────────────────────────────────────┤
│ - Validates JWT against Supabase public key         │
│ - Returns protected resources (products, sales)     │
│ - Enforces multi-tenant isolation                   │
└─────────────────────────────────────────────────────┘
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/supabase.ts` | **NEW** — Supabase client |
| `src/hooks/useSupabaseAuth.ts` | **NEW** — Auth state hook |
| `src/app/login/page.tsx` | Updated to use Supabase login |
| `src/components/auth/ProtectedRoute.tsx` | Updated to use Supabase auth |
| `.env.local` | Added Supabase credentials |
| `/src/app/api/v1/*` | **DELETED** — Old Next.js routes |
| `/src/server/*` | **DELETED** — Old JWT utilities |

---

## Next: Backend Database Integration

Once login works, optionally sync Supabase Auth users with your PostgreSQL `users` table:

```ts
// After successful Supabase login, create/update app user:
const { data: { user } } = await supabase.auth.getUser()
const response = await api.post('/users', {
  id: user.id,
  email: user.email,
  fullName: user.user_metadata.full_name || '',
})
```

Backend route to create/update users from Supabase ID:
```ts
// POST /users (backend)
@Post()
async createUser(@Body() dto: CreateUserDto, @CurrentUser() user: User) {
  return this.userService.upsertFromSupabase(
    dto.id,     // Supabase user.id
    dto.email,  // From Supabase
    dto.fullName
  )
}
```

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

**View stored credentials (DevTools Console):**
```javascript
localStorage.getItem('accessToken')  // JWT
localStorage.getItem('sb-...')       // Supabase session data
```

---

## Questions?

Refer to:
- Supabase Docs: https://supabase.com/docs/guides/auth
- Implementation: `src/hooks/useSupabaseAuth.ts`
- Backend validation: See Step 3 above
