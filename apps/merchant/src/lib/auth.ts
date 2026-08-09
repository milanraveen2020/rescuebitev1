import {
  ApiErrorResponseSchema,
  AuthResponseSchema,
  type ApiErrorCode,
  type AuthResponse,
} from '@rescuebite/types';

/**
 * Browser auth helpers for the merchant web app. Requests use `credentials:
 * 'include'` so the API's httpOnly refresh cookie is set and sent; the access
 * token is returned in the body and kept in memory by callers.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class AuthError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
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
    throw new AuthError('internal_error', 'Could not reach the server. Please try again.');
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(json);
    throw parsed.success
      ? new AuthError(parsed.data.error.code, parsed.data.error.message)
      : new AuthError('internal_error', 'Something went wrong. Please try again.');
  }
  return json;
}

/**
 * Marker cookie so middleware can keep signed-out users out of the app shell.
 * The real session cookie is httpOnly and set by the API on its own domain, so
 * in a split deployment (API and dashboard on different hosts) middleware
 * running here can never see it. This first-party marker carries no authority —
 * the API still authorizes every call — it only drives routing.
 */
const SESSION_MARKER = 'rb_session';

function setSessionMarker(): void {
  document.cookie = `${SESSION_MARKER}=1; path=/; samesite=lax`;
}

function clearSessionMarker(): void {
  document.cookie = `${SESSION_MARKER}=; path=/; max-age=0`;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const session = AuthResponseSchema.parse(await post('/auth/login', { email, password }));
  setSessionMarker();
  return session;
}

/** Exchange the refresh cookie for a fresh access token + user (used on load). */
export async function refreshSession(): Promise<AuthResponse> {
  const session = AuthResponseSchema.parse(await post('/auth/refresh'));
  setSessionMarker();
  return session;
}

export async function logout(): Promise<void> {
  await post('/auth/logout').catch(() => undefined);
  clearSessionMarker();
}
