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
  /** Field-level validation issues, keyed by path. */
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  /** Correlation id for support / log lookups. */
  traceId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
