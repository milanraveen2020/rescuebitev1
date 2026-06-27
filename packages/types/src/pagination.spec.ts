import { describe, expect, it } from 'vitest';
import {
  CursorPaginationQuerySchema,
  OffsetPaginationQuerySchema,
} from './pagination';

describe('CursorPaginationQuerySchema', () => {
  it('applies the default limit when omitted', () => {
    expect(CursorPaginationQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('coerces a string limit from a raw query param', () => {
    const parsed = CursorPaginationQuerySchema.parse({ limit: '50', cursor: 'abc' });
    expect(parsed).toEqual({ limit: 50, cursor: 'abc' });
  });

  it('rejects a limit above the max', () => {
    expect(CursorPaginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('OffsetPaginationQuerySchema', () => {
  it('defaults page, pageSize, and sortOrder', () => {
    expect(OffsetPaginationQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('coerces page/pageSize and keeps an explicit sort', () => {
    const parsed = OffsetPaginationQuerySchema.parse({
      page: '3',
      pageSize: '25',
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    expect(parsed).toEqual({ page: 3, pageSize: 25, sortBy: 'createdAt', sortOrder: 'asc' });
  });

  it('rejects an invalid sort order', () => {
    expect(OffsetPaginationQuerySchema.safeParse({ sortOrder: 'sideways' }).success).toBe(false);
  });
});
