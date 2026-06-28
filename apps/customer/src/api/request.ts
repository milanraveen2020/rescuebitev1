import { ApiErrorResponseSchema, type ApiErrorCode } from '@rescuebite/types';
import { setStoredRefreshToken } from '../auth/storage';
import { api } from './client';
import { session } from './session';

/** Error carrying the API's typed code so screens can branch on it. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const token = session.getRefreshToken();
  if (!token) return false;

  refreshing ??= (async () => {
    const { data } = await api.POST('/auth/refresh', { body: { refreshToken: token } as never });
    if (data?.accessToken) {
      session.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        session.setRefreshToken(data.refreshToken);
        await setStoredRefreshToken(data.refreshToken);
      }
      return true;
    }
    return false;
  })();

  const ok = await refreshing.catch(() => false);
  refreshing = null;
  if (!ok) session.expire();
  return ok;
}

function toApiError(result: FetchResult<unknown>): ApiError {
  const parsed = ApiErrorResponseSchema.safeParse(result.error);
  if (parsed.success) return new ApiError(parsed.data.error.code, parsed.data.error.message);
  if (result.response.status === 401) return new ApiError('unauthenticated', 'Please sign in.');
  return new ApiError('internal_error', 'Something went wrong. Please try again.');
}

/**
 * Run a typed openapi-fetch call, transparently refreshing once on a 401, and
 * returning the parsed data or throwing a typed ApiError.
 */
export async function unwrap<T>(run: () => Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await run();
  } catch {
    throw new ApiError('internal_error', 'Could not reach RescueBite. Check your connection.');
  }

  if (result.response.status === 401 && (await tryRefresh())) {
    result = await run();
  }

  if (result.response.ok && result.data !== undefined) return result.data;
  throw toApiError(result);
}
