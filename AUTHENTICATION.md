# Authentication & Session Management

This document describes the authentication architecture and secure session handling used by SuperShop after migrating to a serverless, database-direct architecture using Supabase Auth.

## Architecture Overview

SuperShop has transitioned to a serverless model where the frontend communicates directly with Supabase for authentication and database operations.

```
┌──────────────────────────────────────────────────────────┐
│                Frontend (Vite SPA + React)               │
│                                                          │
│  - useSupabaseAuth hook manages state                    │
│  - AuthProvider exposes current user & tenant globally    │
│  - Shell Layout guards protected pages                   │
└──────────────────────────────────────────────────────────┘
           │                                      │
           │ Auth Operations                      │ DB Operations
           ▼                                      ▼
┌──────────────────────┐               ┌──────────────────┐
│    Supabase Auth     │               │  Supabase DB     │
│   (Serverless API)   │               │   (PostgREST)    │
└──────────────────────┘               └──────────────────┘
```

## Session & Token Management

1. **Authentication Token**: The JSON Web Token (JWT) is managed entirely on the client by the Supabase client-side SDK.
2. **Token Storage**:
   - The Supabase SDK automatically persists the session (access token, refresh token, user details) in the browser's storage (e.g. `sb-` prefixed keys).
   - For compatibility, the frontend also stores the access token (`accessToken`), user profile (`user`), and current tenant information (`tenant`) in `localStorage` inside `AuthProvider.tsx`.
3. **Session Rehydration**:
   - On app startup, `useSupabaseAuth` rehydrates the session from Supabase storage.
   - `AuthProvider.tsx` fetches the full user profile and associated tenant directly from the `users` and `tenants` tables in Supabase using the client-side `supabase` client.
   - If the database query fails (or table access is limited), `AuthProvider.tsx` gracefully falls back to a profile constructed from the user's JWT metadata.

## User Roles & Navigation

The user profile contains a `role` field (e.g. `OWNER`, `EMPLOYEE`, `SUPER_ADMIN`). This role determines the visible items in the sidebar navigation:
- `getFilteredNavigation(user?.role)` dynamically computes the allowed routes.
- If a user is not authenticated or their profile cannot be resolved, they are redirected to `/login`.

## Profile & Password Updates

Since there is no custom backend, user profile updates (such as full name and email) and password changes are done directly through the client-side Supabase SDK:
- **Profile Details**: Updated using `supabase.auth.updateUser()` and sync'd to the `users` table via `supabase.from('users').update()`.
- **Password Updates**: Updated securely via `supabase.auth.updateUser({ password: newPassword })`.

## Error Handling & Redirects

- **Endless Redirect Loop Fix**: The application previously had a loop where the frontend would attempt to call the decommissioned backend `/users/me` endpoint. This has been replaced by a direct check against the Supabase Session/DB and metadata fallback.
- **Root Route (`/`)**: Redirects authenticated users directly to `/pos` and unauthenticated users to `/login`.
