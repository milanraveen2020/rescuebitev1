import type { CursorPaginationQuery, OffsetPaginationQuery, SortOrder } from '@rescuebite/types';

/**
 * Helpers that turn the shared pagination query schemas into Prisma query args
 * and shape the corresponding page responses. Kept framework-light: they take
 * plain objects so they're trivial to unit-test.
 */

// --- Cursor (feeds) --------------------------------------------------------

export interface CursorFindArgs {
  take: number;
  skip?: number;
  cursor?: { id: string };
}

/**
 * Build Prisma `take`/`cursor`/`skip` for cursor pagination. We over-fetch by one
 * row (`limit + 1`) so the caller can tell whether another page exists.
 */
export function toCursorFindArgs(query: CursorPaginationQuery): CursorFindArgs {
  const args: CursorFindArgs = { take: query.limit + 1 };
  if (query.cursor) {
    args.cursor = { id: query.cursor };
    args.skip = 1; // skip the cursor row itself
  }
  return args;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Slice the over-fetched rows into a page. `getId` extracts the cursor id from
 * the last returned item.
 */
export function toCursorPage<T>(
  rows: T[],
  query: CursorPaginationQuery,
  getId: (item: T) => string,
): CursorPage<T> {
  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? getId(last) : null,
  };
}

// --- Offset (admin tables) -------------------------------------------------

export interface OffsetFindArgs {
  skip: number;
  take: number;
  orderBy?: Record<string, SortOrder>;
}

/**
 * Build Prisma `skip`/`take`/`orderBy` for offset pagination. `allowedSortFields`
 * guards against sorting by arbitrary/unindexed columns; an unknown `sortBy`
 * falls back to `defaultSortField`.
 */
export function toOffsetFindArgs(
  query: OffsetPaginationQuery,
  allowedSortFields: readonly string[],
  defaultSortField: string,
): OffsetFindArgs {
  const sortBy =
    query.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : defaultSortField;
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    orderBy: { [sortBy]: query.sortOrder },
  };
}

export interface OffsetPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toOffsetPage<T>(
  items: T[],
  total: number,
  query: OffsetPaginationQuery,
): OffsetPage<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
