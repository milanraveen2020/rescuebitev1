import { z } from 'zod';

/**
 * Typed Result helper and the canonical API error envelope.
 * Server exception filters and the api-client both serialize to ApiError, so
 * user-facing messages are friendly and internals never leak across the boundary.
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = ApiError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const ApiErrorCodeSchema = z.enum([
  'validation_error',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'sold_out',
  'pickup_window_closed',
  'payment_failed',
  'internal_error',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  /** Safe to show the end user — friendly, never leaks stack traces or SQL. */
  message: z.string(),
  /**
   * Optional machine-readable extra context (e.g. per-field validation issues,
   * a correlation/trace id). Never contains stack traces or internal details.
   */
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * The canonical JSON error envelope returned by the API for every non-2xx
 * response: `{ error: { code, message, details? } }`. The server's exception
 * filter produces exactly this shape and the api-client parses it.
 */
export const ApiErrorResponseSchema = z.object({
  error: ApiErrorSchema,
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
