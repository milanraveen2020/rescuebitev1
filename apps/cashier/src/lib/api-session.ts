import {
  ApiErrorResponseSchema,
  AuthResponseSchema,
  type ApiErrorCode,
  type AuthResponse,
} from '@rescuebite/types';

/**
 * Transport for the Cashier PWA. The access token lives in memory; the API's
 * httpOnly refresh cookie mints a new one on demand and recovers from a 401.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function fail(json: unknown): never {
  const parsed = ApiErrorResponseSchema.safeParse(json);
  throw parsed.success
    ? new ApiRequestError(parsed.data.error.code, parsed.data.error.message)
    : new ApiRequestError('internal_error', 'Something went wrong. Please try again.');
}

async function post(path: string, body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiRequestError('internal_error', 'Could not reach the server. Please try again.');
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) fail(json);
  return json;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return AuthResponseSchema.parse(await post('/auth/login', { email, password }));
}

/** Exchange the refresh cookie for a fresh access token + user (used on load). */
export async function refreshSession(): Promise<AuthResponse> {
  return AuthResponseSchema.parse(await post('/auth/refresh'));
}

export async function logout(): Promise<void> {
  await post('/auth/logout').catch(() => undefined);
}

async function tokenOrRefresh(): Promise<string> {
  if (accessToken) return accessToken;
  const session = await refreshSession();
  accessToken = session.accessToken;
  return accessToken;
}

/** Authenticated fetch that refreshes once and retries on a 401. */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: { ...init.headers, authorization: `Bearer ${token}` },
    });

  let response = await send(await tokenOrRefresh());
  if (response.status === 401) {
    const session = await refreshSession();
    accessToken = session.accessToken;
    response = await send(accessToken);
  }
  return response;
}

/** Send an authenticated request and return the parsed JSON body (Zod-parse it). */
export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authedFetch(path, init);
  } catch (e) {
    if (e instanceof ApiRequestError) throw e;
    throw new ApiRequestError('internal_error', 'Could not reach the server. Please try again.');
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) fail(json);
  return json;
}

/** Convenience for JSON-body mutations. */
export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
