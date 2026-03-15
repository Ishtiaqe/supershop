Authentication & token storage recommendations
==========================================

Summary
-------
This document describes the secure token-handling approach used by SuperShop and recommendations for "remember me" / auto-login behavior.

## Token Management

- Access Token: short-lived (15m) — stored in localStorage as `accessToken`.
- Refresh Token: long-lived (7d or more) — stored in httpOnly cookie by the backend.
- Access tokens are attached to requests via the `Authorization: Bearer {token}` header.
- Refresh tokens are automatically sent via cookies (withCredentials: true).

Why httpOnly cookies for refresh tokens?

- Enhanced security: httpOnly cookies cannot be accessed by JavaScript, protecting against XSS attacks.
- Refresh tokens are long-lived and more sensitive, so they deserve extra protection.
- Access tokens remain in localStorage for easy access and automatic attachment via Axios interceptors.
- Backend automatically reads refresh token from cookies during `/auth/refresh` calls.

Remember Me / Auto-login
-------------------------
To support user auto-login without using localStorage for credentials:

1. Use a long-lived refresh token with server-side rotation. If the user checks "Remember me", issue a refresh token with longer expiration (e.g., 30 days), but track the session and device on the server.
2. On each refresh, rotate the refresh token and store the new token in localStorage and persist the associated session in DB.
3. On logout, revoke the refresh token in the DB and clear localStorage.

Device-tracking & security
--------------------------
- Bind refresh tokens to device records and fingerprint relevant device metadata (User-Agent, IP, device id) on the server.
- Implement refresh-token rotation so that when a refresh token is used, the server issues a new refresh token and invalidates the old one — this mitigates replay attacks.

## Security Considerations

Since we're using Bearer token authentication via Authorization headers:
- CSRF protection is not required (tokens are not sent automatically like cookies)
- Implement proper XSS protection (sanitize user inputs, use Content Security Policy)
- Store tokens securely and clear on logout

Fallbacks (optional)
--------------------
- For offline usage (e.g., POS app) or native apps, store the refresh token in native secure storage.
- For the web, store tokens in localStorage for easy access and automatic inclusion in API requests.

Frontend implementation notes
----------------------------
- Use Axios interceptors to attach `Authorization: Bearer {token}` header from localStorage.
- Automatically refresh tokens when they expire using refresh token interceptor.
- Use `AuthProvider` (client-only) to hydrate session on app start: it calls `/users/me`, falls back to `/auth/refresh` then `/users/me`, and persists user profile and tenant data in `localStorage`.
- Access token is stored in localStorage; refresh token is stored in httpOnly cookie by the backend.
- On logout, clear accessToken from localStorage and call `/auth/logout` to clear the httpOnly cookie.

Client behavior to avoid flicker
-------------------------------
- Defer strict auth to the client: do not perform SSR redirects; the `Shell` waits for `AuthProvider` to finish loading before deciding redirects.
- Single-flight refresh queue in the API client ensures only one refresh runs; queued requests retry after success.
- Proactively refresh the access token at ~80–90% TTL (default ~12 minutes if TTL is 15 minutes) to minimize 401s.
- When `/users/me` fails, `AuthProvider` performs `/auth/refresh` and retries once before marking the user unauthenticated.

Simplified state management
--------------------------
- Centralized in `src/components/auth/AuthProvider.tsx` exposing `useAuth()` with `{ user, loading, refresh, logout }`.
- `Shell` and `Login` consume `useAuth()` instead of calling auth endpoints directly.
- Logged-in state is preserved in localStorage; `AuthProvider` rehydrates on app start by checking for tokens.

Server-side recommendations
--------------------------
- Store refresh tokens hashed in DB using a secure hashing algorithm so a leaked DB doesn't reveal raw tokens.
- Revoke old refresh tokens on logout and when rotating.
- Optional: For long-lived sessions, send a `refreshTokenExpiresAt` policy per device.
