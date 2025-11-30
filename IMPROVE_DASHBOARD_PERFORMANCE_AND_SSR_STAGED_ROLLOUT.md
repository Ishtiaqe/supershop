# Improve Dashboard Performance & SSR Staged Rollout (Option 3)

TL;DR — Migrate dashboard to server-driven rendering (SSR) for best FCP/LCP & INP improvements, while minimizing risk via staged rollout using feature flags and canary releases. This delivers faster HTML, lower JS payload/hydration, and improved user experience. The plan includes immediate quick wins, SSR migration details, auth changes for server data access, and a comprehensive staged rollout/rollback procedure.

---

## Goals
- Improve FCP and LCP by reducing initial JS & hydration cost on dashboard.
- Improve INP by minimizing main-thread work and ensuring the page becomes interactive quickly.
- Maintain tenant-isolation & security during SSR migration.
- Deliver a safe staged rollout path (canary & feature flag), monitoring, and rollback procedures.

---

## Assumptions & Requirements
- Current dashboard is client-only with usage of `useQuery`, `framer-motion`, `recharts`, and AntD.
- Authentication currently uses JWT access/refresh in localStorage.
- Hosting currently uses static export; SSR requires hosting runtime that supports server rendering (Cloud Run, Vercel Server Functions, Node server).
- Team can modify auth flow (allow cookies) and deploy to new hosting or configure serverless.

---

## Pre-Reqs (Tasks before migration)
1. Baseline performance and bundle analysis (Lighthouse & Next bundle analyzer).
   - Add `@next/bundle-analyzer` and record results.
2. Choose hosting or server platform to support SSR (Cloud Run / Vercel Server functions).
3. Confirm a timeline and a feature flag provider or strategy (LaunchDarkly, Unleash, custom env flag).
4. Coordinate backend changes to support server-side data fetch (cookie auth or server-to-server token).
5. Define clear ownership for backend & frontend changes.

---

## High-Level Plan (Phases)

Phase 0 — Baseline:
- Run Lighthouse & bundle analyzer; record metrics for FCP/LCP/INP and chunk sizes (main, recharts, framer-motion, antd).
- Add Playwright smoke tests for dashboard during deployments.

Phase 1 — Quick Wins (low risk):
- Dynamic import `DashboardCharts` (client-only) with skeleton placeholder or intersection-loading.
- Replace LCP-critical animations with CSS; lazy load framer-motion.
- Inline small icons, optimize fonts (`next/font`), and defer analytics or non-critical scripts.
- Re-measure with Lighthouse & analyzer.

Phase 2 — Partial SSR for Summary Metrics (medium risk):
- Separate the dashboard: server-rendered summary cards (ordersCount, totalRevenue, totalProfit, assetValue) and client-only components for charts and interactivity.
- Add a secure backend endpoint to return summary metrics (server-cached & tenant-aware).
- Implement cookie-based HttpOnly auth or server-side service account to fetch tenant-specific metrics:
  - If cookie-based: change login to set secure cookies; adjust client to read cookies for client fetch (if needed).
  - If using cached public endpoint: ensure no sensitive data leakage across tenants; use tenant-specific URL or token.

Phase 3 — Full SSR (Option 3) — Migrate dashboard & deeper pages:
- Change `dashboard/page.tsx` to server component (remove `"use client"`) or split:
  - Server component renders all static & summary content (pre-rendered HTML).
  - Client components provide incremental hydration for charts & interactions.
- Convert data fetching using Next's server fetching or internal `api` server route that uses server-side cookies for authentication.
- Adjust Next config for dynamic rendering if needed (remove static export flags).
- Deploy to hosting with server runtime.

Phase 4 — Performance polishing:
- Replace big charting libraries with a lighter library if necessary, or generate initial chart snapshots server-side.
- Add caching (ISR or cached endpoint TTL) for metrics to reduce server load.
- Monitor and optimize server CPU & response times.

Phase 5 — Cleanup:
- Remove fallback legacy code & verify all edge cases.
- Document new auth flow and SSR requirements for developers.

---

## Staged Rollout & Canary Plan

Overview: We will implement a staged rollout using feature flags + canary traffic. That ensures a controlled rollout, gradual traffic promotion, and immediate rollback if regressions occur.

1. Feature Flag Setup
   - Use `NEXT_PUBLIC_FEATURE_FLAGS` or a robust feature flag provider (LaunchDarkly, Unleash).
   - Define `DASHBOARD_SSR_ENABLED` flag:
     - `false`: current client-only version
     - `true`: SSR variant
   - Add server-side feature flag check to route handling (if you host backend).

2. Canary Release Strategy
   - Deploy new SSR build behind feature flag.
   - Host adjustments:
     - Vercel: configure Canary deployments with project settings or use split traffic to Poly hosted apps.
     - Cloud Run: Deploy two revisions and route a small % of traffic to the new revision.
   - Flow:
     - Canary -> 1–5% for a short period -> 10% -> 25% -> 50% -> 100%
   - Monitor each stage for threshold breaches.

3. Monitoring & Thresholds (Promote / Rollback)
   - Performance thresholds to promote:
     - LCP improved by X (e.g., 10–20%) or not degraded
     - FCP improved or not degraded
     - INP reduced by measurement baseline
     - Error rate < 0.5% or within acceptable delta
     - 95th percentile TTFB within acceptable delta
   - Additional signal:
     - Page load errors, console exceptions, API failures, CPU spikes, and user reported performance regressions.
   - If any threshold fails, roll back:
     - Immediately toggle `DASHBOARD_SSR_ENABLED=false` or revert traffic split to rollback to previous build.

4. Canary performance testing:
   - Deploy the new SSR code and automatically run Lighthouse or a synthetic test (e.g., WebPageTest) on a sample subset (canary group).
   - Use Playwright or other E2E tests to ensure functional parity.

5. Safety net / Revert
   - Ensure feature flag toggles are immediate (not requiring a full redeploy).
   - Keep both builds on servers to support quick route switch.

6. Verification plan for each stage:
   - Automated regression checks
   - Manual QA via UAT dashboards for 1–5%
   - Health checks for error rates & metrics
   - Run Playwright tests in each canary deployment

---

## Implementation & File Changes (Detailed)

Core frontend files:
- `supershop-frontend/src/app/dashboard/page.tsx`
  - Convert to server component (remove `"use client"`), or split into `Dashboard.server.tsx` (server) and `Dashboard.client.tsx` (client).
  - Import/Render charts in client-only subcomponent (dynamic import).
- `supershop-frontend/src/components/dashboard/DashboardCharts.tsx`
  - Leave as client component, lazy-load within `dashboard/page.tsx`.
- `supershop-frontend/src/lib/api.ts`
  - Add server-side client (for SSR use) or use service token in server environment.
- `supershop-frontend/src/app/layout.tsx` (if `framer-motion` is used in Shell)
  - Add lazy loading for `framer-motion` and ensure CSS-only transitions for LCP items.

Backend changes:
- Add new API:
  - `GET /analytics/summary` or `GET /api/v1/analytics/summary` (tenant-aware; TTL caching)
  - Implement caching (Redis or in-memory TTL) for summary metrics to reduce DB load.
- Auth changes:
  - Add logic to set HttpOnly tokens (server cookie).
  - Ensure server side can consume those cookies for server fetches.

Other files & features:
- `package.json`: Add analyzer scripts.
- CI/CD configs:
  - Add Lighthouse check & canary deployment steps to CI pipeline (GitHub Actions / Vercel).
  - Add Playwright E2E tests for dashboard before and after SSR.

---

## Testing & Acceptance Criteria

Tests:
- Unit tests for data fetching endpoints, caching & sanitizer.
- E2E tests (Playwright) for:
  - Dashboard loads successfully (server-side rendered summary).
  - Charts load client-side after placeholder (or images if snapshot).
  - Login flows with cookie-based auth (if applicable).

Lighthouse / Performance Acceptance:
- FCP: improvement target vs baseline (e.g., reduce by 20–30% from 3.21s to ~2.0s)
- LCP: improvement target vs baseline (e.g., reduce by 30–40% from 3.75s to ~2.5s)
- INP: reduce main thread blocks; target less than 200ms where possible
- 90/95th percentile latency improvements on server (TTFB).
- Errors: <0.5% increase in error rate.

QA Approvals:
- QA signoff for each canary phase (1–5% -> 10% -> 25%).
- Product signoff for UX changes.

---

## Rollback Plan
- Via feature flag: Toggle `DASHBOARD_SSR_ENABLED=false` to revert immediately to client-only version.
- Via deployment: Switch traffic back from canary revision to pre-canary revision.
- If issues are more complex:
  - Revert PR(s) quickly and re-deploy.
  - Keep cached endpoints intact and migration reusable.

---

## Timeline & Estimated Work
Estimated time for full Option 3 (varies by team size & required infra changes):
- Baseline measurement & analyzer — 1–2 days
- Quick wins (dynamic charts, framer-motion deferral, fonts & icons) — 3–5 days
- Partial SSR for summary metrics and caching endpoint — 5–10 days (includes backend work)
- Full SSR migration, auth changes, hosting & deployment config — 10–20 days (includes middleware & cookie auth rollout)
- Canary rollout & monitoring — 1–5 days (depends on canary cycle)
- Cleanup & documentation — 2–3 days

Total range: 3–6 weeks depending on complexity of auth & hosting changes.

---

## Metrics & Monitoring (What to capture)
- Lighthouse scores (FCP/LCP/INP) at baseline & post-deploy
- Bundle size / chunk sizes for `main`, `recharts`, `framer-motion`, `antd`.
- Backend: metric latency & uptime, 95th percentile response times.
- Error tracking: Sentry/Logging for client errors & server-side exceptions.
- Playwright test pass rate for E2E.

---

## Example Commands / Minimal Developer Workflow
- Add analyzer dependency:
  ```bash
  cd supershop-frontend
  npm i -D @next/bundle-analyzer
  ```
- Run bundle analyzer:
  ```bash
  ANALYZE=true npm run build
  ```
- Run Lighthouse locally:
  ```bash
  # Run dev server first:
  npm run dev
  # In another terminal:
  npx lighthouse http://localhost:3000/dashboard --output=json --output-path=./lh-report.json
  ```
- Running Playwright:
  ```bash
  cd supershop-frontend
  npx playwright test tests/dashboard.spec.ts
  ```

---

## Open Questions / Decisions needed from you
1. Confirm: Option 3 — Full SSR migration (Yes).
2. Hosting: Are we allowed to switch from static export to a Node/SSR host (Cloud Run, Vercel serverless)? If not, the SSR approach must be changed (use serverless functions or cached endpoints).
3. Auth: Is migrating to HttpOnly cookie-based auth acceptable? This is required for tenant-sensitive server-side fetches.
4. Feature flags: Which provider do you prefer? (LaunchDarkly, Unleash, custom env var).
5. Team resources: Who will own backend changes? (owner names or roles).
6. Canary percentages: confirm if we should use 5% steps or smaller/faster promotion.

---

## Next Steps (I can do these next)
1. Add a baseline analyzer script & CI job; capture baseline metrics.
2. Implement quick wins in a PR:
   - dynamic import `DashboardCharts`, CSS for header & summary, lazy framer-motion
   - inline small icons & `next/font` for Inter
3. Draft initial `DASHBOARD_SSR_ENABLED` feature flag & plan a staged rollout on a test environment.
4. Draft backend changes (cookie-based auth + cached metrics endpoint).
5. Implement Steps 2–4 in PRs, do canary rollout & monitor.

Please confirm the following:
- You want Option 3 (Full SSR). — Confirmed by you, great.
- Hosting & auth policy: Are SSR hosting changes & cookie-based auth OK?  
- Feature flags: Use a built-in env var or provider?
- I can proceed to prepare the initial baseline PR (bundle analyzer + quick wins) and draft the full migration PR for review.

Once you confirm, I’ll produce the PR templates and detailed plan for each phase (exact file edits and test changes).
