import { ApiErrorResponseSchema, type ApiErrorCode } from '@rescuebite/types';
import { authedFetch } from './session';

/**
 * Shared request helper for merchant feature APIs. Sends an authenticated
 * request, and on a non-2xx response normalizes the `ApiError` envelope into a
 * typed `ApiRequestError` so callers can show a friendly message (and surface
 * field-level validation errors where present).
 */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await authedFetch(path, init);
  } catch {
    throw new ApiRequestError('internal_error', 'Could not reach the server. Please try again.');
  }
}

function fail(json: unknown): never {
  const parsed = ApiErrorResponseSchema.safeParse(json);
  if (parsed.success) {
    const details = parsed.data.error.details as
      { fieldErrors?: Record<string, string[]> } | undefined;
    throw new ApiRequestError(
      parsed.data.error.code,
      parsed.data.error.message,
      details?.fieldErrors,
    );
  }
  throw new ApiRequestError('internal_error', 'Something went wrong. Please try again.');
}

/** Send a request and return the parsed JSON body (unknown — Zod-parse it). */
export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await send(path, init);
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) fail(json);
  return json;
}

/** Send a request that returns no content (204). Throws on error. */
export async function apiRequestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await send(path, init);
  if (!response.ok) {
    const json: unknown = await response.json().catch(() => null);
    fail(json);
  }
}

/** Convenience for JSON-body mutations. */
export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
