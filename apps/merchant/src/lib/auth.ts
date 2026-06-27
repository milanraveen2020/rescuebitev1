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
