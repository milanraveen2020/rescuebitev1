import { z } from 'zod';

/**
 * Pagination + sorting contracts shared by the API and every frontend.
 *
 * Two strategies, picked per use case:
 *  - **Cursor pagination** for infinite/append feeds (customer listing feeds,
 *    notifications). Stable under inserts; cannot jump to an arbitrary page.
 *  - **Offset pagination** for admin tables that need page numbers + totals.
 *
 * Query schemas use `z.coerce` so they parse raw string query params directly.
 */

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// --- Cursor (feeds) --------------------------------------------------------

export const CursorPaginationQuerySchema = z.object({
  /** Opaque cursor (an entity id) marking the last item of the previous page. */
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>;

export const CursorPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    /** Pass back as `cursor` to fetch the next page; null when there are no more. */
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });

// --- Offset (admin tables) -------------------------------------------------

export const OffsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().min(1).optional(),
  sortOrder: SortOrderSchema.default('desc'),
});
export type OffsetPaginationQuery = z.infer<typeof OffsetPaginationQuerySchema>;

export const OffsetPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
