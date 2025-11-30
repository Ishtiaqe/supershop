import * as Sentry from '@sentry/nextjs';
import type { Span as SentrySpan } from '@sentry/types';

// Re-export Sentry for convenience; the actual initialization happens via
// `sentry.client.config.js` and `sentry.server.config.js` per Next.js docs.
export default Sentry;

export function captureException(error: unknown, context?: Record<string, unknown>) {
  try {
    Sentry.captureException(error, { extra: context });
  } catch {
    // no-op: don't throw from logger
  }
}

export function startSpan(name: string, op: string, attrs?: Record<string, string | number | boolean>) {
  try {
    const hub = Sentry as unknown as { startTransaction?: (opts: { name: string; op?: string }) => SentrySpan | undefined };
    const span: SentrySpan | undefined = hub.startTransaction ? hub.startTransaction({ name, op }) : undefined;
    if (span && attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        span.setAttribute(k, String(v));
      }
    }
    return span;
  } catch {
    return undefined;
  }
}
