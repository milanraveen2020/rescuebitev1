import { ApiErrorSchema, err, ok, type ApiError, type Result } from '@rescuebite/types';
import type { z } from 'zod';

/**
 * Minimal, framework-agnostic HTTP core shared by every frontend. Every response
 * is validated against a Zod schema, and failures are normalized to ApiError so
 * callers always get a typed Result — never an unparsed `any`.
 */

export interface ApiClientConfig {
  baseUrl: string;
  /** Returns the bearer token (or null) at call time, so refreshes are picked up. */
  getAuthToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions<TBody> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
  signal?: AbortSignal;
}

const internalError: ApiError = {
  code: 'internal_error',
  message: 'Something went wrong on our end. Please try again in a moment.',
};

export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async request<TResponse>(
    responseSchema: z.ZodType<TResponse>,
    options: RequestOptions<unknown>,
  ): Promise<Result<TResponse, ApiError>> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const url = this.buildUrl(options.path, options.query);

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const token = await this.config.getAuthToken?.();
    if (token) headers.authorization = `Bearer ${token}`;

    // Build init conditionally: under exactOptionalPropertyTypes, `fetch` rejects
    // an explicit `undefined` for body/signal, so only set keys that have a value.
    const init: RequestInit = { method: options.method ?? 'GET', headers };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);
    if (options.signal !== undefined) init.signal = options.signal;

    let raw: Response;
    try {
      raw = await fetchImpl(url, init);
    } catch (cause) {
      return err({
        code: 'internal_error',
        message: 'We could not reach RescueBite. Check your connection and try again.',
        traceId: cause instanceof Error ? cause.message : undefined,
      });
    }

    const json: unknown = await raw.json().catch(() => null);

    if (!raw.ok) {
      const parsedError = ApiErrorSchema.safeParse(json);
      return err(parsedError.success ? parsedError.data : internalError);
    }

    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      return err({
        code: 'internal_error',
        message: 'We received an unexpected response. Please try again.',
      });
    }
    return ok(parsed.data);
  }

  private buildUrl(path: string, query?: RequestOptions<unknown>['query']): string {
    const url = new URL(path.replace(/^\//, ''), this.ensureTrailingSlash(this.config.baseUrl));
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private ensureTrailingSlash(base: string): string {
    return base.endsWith('/') ? base : `${base}/`;
  }
}
