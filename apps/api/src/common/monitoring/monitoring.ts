import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/**
 * Error monitoring (Sentry), wired but inert unless `SENTRY_DSN` is set — so
 * local/dev/CI runs never phone home. Initialize once at boot; the exception
 * filter forwards unexpected 5xx errors via `captureException`.
 */
let enabled = false;
const logger = new Logger('Monitoring');

export function initMonitoring(dsn: string | undefined, environment: string): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
    // Don't capture expected 4xx noise; the filter only forwards real errors.
    ignoreErrors: ['ZodError'],
  });
  enabled = true;
  logger.log('Sentry error monitoring enabled.');
}

export function captureException(error: unknown): void {
  if (!enabled) return;
  Sentry.captureException(error);
}
