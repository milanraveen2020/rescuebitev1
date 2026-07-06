import type { ConfigContext, ExpoConfig } from 'expo/config';

// Dynamic Expo config: start from the static app.json (received as `config`),
// then let an optional local .env override the API base URL. `client.ts` reads
// the resolved value from `expo.extra.apiBaseUrl`, so nothing in the app changes.
//
// Precedence: EXPO_PUBLIC_API_BASE_URL (per-developer .env) → app.json default
// (http://10.0.2.2:4000, the host loopback the Android emulator uses) → localhost.
export default ({ config }: ConfigContext): ExpoConfig => {
  // `process.env` is untyped (any) in this toolchain, so narrow explicitly.
  const envApiBaseUrl =
    typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string'
      ? process.env.EXPO_PUBLIC_API_BASE_URL
      : undefined;

  return {
    ...config,
    name: config.name ?? 'RescueBite',
    slug: config.slug ?? 'rescuebite',
    extra: {
      ...config.extra,
      apiBaseUrl:
        envApiBaseUrl ??
        (config.extra?.apiBaseUrl as string | undefined) ??
        'http://10.0.2.2:4000',
    },
  };
};
