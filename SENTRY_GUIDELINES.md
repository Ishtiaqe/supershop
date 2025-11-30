Sentry — Guidelines for use in SuperShop (Frontend)
================================================

This file provides guidelines and examples for using Sentry in the frontend.

Initialization
--------------
Sentry is initialized via `sentry.client.config.js` / `sentry.server.config.js`. Do not call `Sentry.init` multiple times from app code.

Basic usage
-----------
1) Capture exceptions:
```ts
import Sentry from '@/lib/sentry';

try {
  // some code
} catch (err) {
  Sentry.captureException(err);
}
```

2) Custom spans (tracing):
```ts
import Sentry from '@/lib/sentry';

const span = Sentry.startSpan({ op: 'http.client', name: 'GET /api/users/me' });
try {
  await fetch('/api/users/me');
} catch (err) {
  Sentry.captureException(err);
} finally {
  span.finish();
}
```

3) Console logging integration
`Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })` is enabled to capture key console messages.

Guidelines
----------
- Prefer `Sentry.captureException(error)` for actual errors.
- Use custom spans to measure UI / API operations where helpful for performance.
- Avoid capturing sensitive data in events; sanitize PII before attaching to Sentry events.

Server-Side Notes
-----------------
For server-side tracing and error captures use `sentry.server.config.js` and `@sentry/node`.
