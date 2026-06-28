import Constants from 'expo-constants';
import { createApiClient, type RescueBiteClient } from '@rescuebite/api-client';
import { session } from './session';

const extra = Constants.expoConfig?.extra as
  | { apiBaseUrl?: string; stripePublishableKey?: string }
  | undefined;

export const API_BASE_URL = extra?.apiBaseUrl ?? 'http://localhost:4000';
export const STRIPE_PUBLISHABLE_KEY = extra?.stripePublishableKey ?? 'pk_test_unset';

// Tell the API this is a mobile client so it returns the refresh token in the body.
const fetchWithClientType: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers ?? {});
  headers.set('x-client-type', 'mobile');
  return fetch(input, { ...init, headers });
};

/** The shared, typed API client (openapi-fetch) with auth + mobile headers. */
export const api: RescueBiteClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAuthToken: () => session.getAccessToken(),
  fetchImpl: fetchWithClientType,
});
