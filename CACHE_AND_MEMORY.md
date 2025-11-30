Client-side caching & memory patterns
===================================

This document summarizes the in-browser memory and cache layers used by the frontend to improve performance and loading behavior.

Key memory & caching layers
---------------------------

1) In-memory React state
   - Short lived, kept in React component state and contexts.
   - Use for UI state and ephemeral values that don’t need to persist across refresh.

2) TanStack Query (React Query) cache
   - Used for caching server resources and deduplicating network requests.
   - Typically uses a short TTL and implements stale-while-revalidate for UX.
   - Optionally persisted to IndexedDB for offline/fast-start behavior.

3) Service Worker (Cache API) – PWA
   - Use to pre-cache the app shell (static JS/CSS/HTML) and images.
   - Runtime caching for API endpoints can be added: stale-while-revalidate for non-sensitive data.
   - Ensure authentication checks for cached responses (don’t cache /users/me or other private endpoints unless encrypted & validated).

4) IndexedDB (idb-keyval)
   - Store structured offline data (e.g., POS transactions, offline queues, product lists for offline browsing)
   - Persist React Query cache for faster hydration on load.

5) localStorage & sessionStorage
   - Use only for non-sensitive data such as UI preferences, small cache keys, or user display info.
   - Avoid storing tokens (access/refresh) in localStorage — HttpOnly cookies are preferred for auth.

6) Browser cache (HTTP) & CDN/Edge
   - Set proper `Cache-Control`, `ETags`, and `immutable` for static assets.
   - For dynamic data, use `cache-control: s-maxage=0, stale-while-revalidate` for edge caches.

7) In-app LRU / Memory cache
   - For repeated heavy in-page calculations (e.g., reports), consider a small in-memory LRU cache to reduce recomputation.

Best practices
--------------
- Protect sensitive data: never persist access tokens in localStorage. Use HttpOnly cookies.
- Use `TanStack Query` for data fetching and caching; consider `persistQueryClient` to store query cache in IndexedDB.
- Use a service worker for PWA & static assets — keep private endpoints out of runtime cache unless explicitly encrypted and invalidated.
- Consider reducing JS and third-party libs on critical LCP pathways (we lazy-load charts, etc.).

Special note: POS/offline flows
----------------------------
For offline POS, enqueue transactions in IndexedDB and sync when the device is online. Use native/secure store for tokens on native apps.
