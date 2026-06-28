/**
 * Error monitoring hook (Sentry), wired but env-gated. Inert unless
 * NEXT_PUBLIC_SENTRY_DSN is set, so local/dev runs never report. To activate:
 * `pnpm add @sentry/nextjs`, then uncomment the init below.
 */
let initialized = false;

export function initMonitoring(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (initialized || !dsn) return;
  initialized = true;
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.init({ dsn, tracesSampleRate: 0.1 });
}
