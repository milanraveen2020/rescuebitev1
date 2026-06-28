import { ApiErrorResponseSchema, type ApiErrorCode } from '@rescuebite/types';
import { authedFetch } from './session';

/** Typed error normalized from the API's `ApiError` envelope. */
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

export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await send(path, init);
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) fail(json);
  return json;
}

export async function apiRequestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await send(path, init);
  if (!response.ok) {
    const json: unknown = await response.json().catch(() => null);
    fail(json);
  }
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

/** Build a query string from a flat record, omitting empty values. */
export function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}
