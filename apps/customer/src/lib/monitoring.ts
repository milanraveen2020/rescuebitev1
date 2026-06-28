import Constants from 'expo-constants';

/**
 * Error monitoring hook (Sentry), wired but env-gated. Inert unless a DSN is
 * provided via `expo.extra.sentryDsn` (or EXPO_PUBLIC_SENTRY_DSN), so dev/Expo
 * Go never reports. To activate: `npx expo install @sentry/react-native`, then
 * uncomment the init below and add the Sentry config plugin.
 */
let initialized = false;

function dsn(): string | undefined {
  const extra = Constants.expoConfig?.extra as { sentryDsn?: string } | undefined;
  return extra?.sentryDsn;
}

export function initMonitoring(): void {
  if (initialized || !dsn()) return;
  initialized = true;
  // import * as Sentry from '@sentry/react-native';
  // Sentry.init({ dsn: dsn(), tracesSampleRate: 0.1 });
}
