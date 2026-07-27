import Constants from 'expo-constants';
import { createApiClient, type RescueBiteClient } from '@rescuebite/api-client';
import { session } from './session';

const extra = Constants.expoConfig?.extra as
  { apiBaseUrl?: string; stripePublishableKey?: string } | undefined;

// In dev mode, derive the API host from Metro's own connection address (the
// same LAN IP the device used to load the JS bundle) rather than trusting a
// baked-in config value — this works whether we're on the simulator, a dev
// client, or a physical phone in Expo Go, all of which see a different host.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_BASE_URL = __DEV__
  ? `http://${devHost ?? 'localhost'}:4000`
  : (extra?.apiBaseUrl ?? 'http://localhost:4000');
export const STRIPE_PUBLISHABLE_KEY = extra?.stripePublishableKey ?? 'pk_test_unset';

// Tell the API this is a mobile client so it returns the refresh token in the body.
const fetchWithClientType: typeof fetch = (input, init) => {
  // openapi-fetch invokes a custom fetch with a fully-built `Request` (with body
  // and Content-Type baked in) and no `init`. Rebuilding from `init` therefore
  // dropped the body and Content-Type on POST/PATCH — so add the header to the
  // Request itself, preserving body and headers.
  const request = new Request(input, init);
  request.headers.set('x-client-type', 'mobile');
  return fetch(request);
};

/** The shared, typed API client (openapi-fetch) with auth + mobile headers. */
export const api: RescueBiteClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAuthToken: () => session.getAccessToken(),
  fetchImpl: fetchWithClientType,
});
