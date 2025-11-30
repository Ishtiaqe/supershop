Authentication & token storage recommendations
==========================================

Summary
-------
This document describes the secure token-handling approach used by SuperShop and recommendations for "remember me" / auto-login behavior.

Recommended approach (current implementation)
---------------------------------------------
- Access Token: short-lived (15m) — stored as an HttpOnly cookie named `accessToken`.
- Refresh Token: long-lived (7d or more) — stored as an HttpOnly cookie named `refreshToken`.
- Cookie options for production: `Secure`, `SameSite=None`, `HttpOnly`, `domain=.shomaj.one` and `path=/`.

Why cookies?
------------
- HttpOnly cookies cannot be read by JavaScript which reduces the risk of XSS token theft.
- Cookies are sent automatically with requests when `withCredentials` is enabled on the client.

Remember Me / Auto-login
-------------------------
To support user auto-login without using localStorage for credentials:

1. Use a long-lived refresh token with server-side rotation. If the user checks "Remember me", issue a refresh token with longer expiration (e.g., 30 days), but track the session and device on the server.
2. On each refresh, rotate the refresh token and store the new token in the HttpOnly cookie and persist the associated session in DB.
3. On logout, revoke the refresh token in the DB and clear the HttpOnly cookie.

Device-tracking & security
--------------------------
- Bind refresh tokens to device records and fingerprint relevant device metadata (User-Agent, IP, device id) on the server.
- Implement refresh-token rotation so that when a refresh token is used, the server issues a new refresh token and invalidates the old one — this mitigates replay attacks.

CSRF & Cookie APIs
------------------
Since we're using cookies for auth, enforce CSRF protections for state-changing requests (POST/PUT/DELETE). Options:
- Use `SameSite=Lax` for safer default; use `SameSite=None` only when cross-site context is needed and ensure you use CSRF tokens (double-submit cookie pattern).
- Require a CSRF header/anti-forgery token for all non-GET requests.

Fallbacks (optional)
--------------------
- For offline usage (e.g., POS app) or native apps, consider issuing tokens designed for native storage: securely store the refresh token in native secure storage instead of localStorage.
- For the web, avoid localStorage for storing tokens. Use localStorage only for **non-sensitive** UI preferences, user display name, or tenant data.

Frontend implementation notes
----------------------------
- Set `axios` config `withCredentials: true` and avoid reading tokens from `localStorage` for requests.
- Perform quick session checks by calling `/users/me` server route — the backend will read cookies and return a profile if authenticated.
- Persist only non-sensitive data (user display name / tenant settings) in the browser; do not persist tokens to localStorage.

Server-side recommendations
--------------------------
- Store refresh tokens hashed in DB using a secure hashing algorithm so a leaked DB doesn't reveal raw tokens.
- Revoke old refresh tokens on logout and when rotating.
- Optional: For long-lived sessions, send a `refreshTokenExpiresAt` policy per device.
