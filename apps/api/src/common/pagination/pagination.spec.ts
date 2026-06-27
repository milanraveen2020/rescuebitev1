import {
  toCursorFindArgs,
  toCursorPage,
  toOffsetFindArgs,
  toOffsetPage,
} from './pagination';

describe('cursor pagination', () => {
  it('over-fetches by one and has no cursor on the first page', () => {
    expect(toCursorFindArgs({ limit: 20 })).toEqual({ take: 21 });
  });

  it('skips the cursor row when a cursor is given', () => {
    expect(toCursorFindArgs({ limit: 10, cursor: 'abc' })).toEqual({
      take: 11,
      cursor: { id: 'abc' },
      skip: 1,
    });
  });

  it('reports hasMore and the next cursor when over-fetched', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const page = toCursorPage(rows, { limit: 2 }, (r) => r.id);
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('b');
  });

  it('reports the last page with no next cursor', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const page = toCursorPage(rows, { limit: 5 }, (r) => r.id);
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});

describe('offset pagination', () => {
  it('computes skip/take and uses an allowed sort field', () => {
    const args = toOffsetFindArgs(
      { page: 3, pageSize: 20, sortBy: 'createdAt', sortOrder: 'asc' },
      ['createdAt', 'name'],
      'createdAt',
    );
    expect(args).toEqual({ skip: 40, take: 20, orderBy: { createdAt: 'asc' } });
  });

  it('falls back to the default sort field for a disallowed sortBy', () => {
    const args = toOffsetFindArgs(
      { page: 1, pageSize: 10, sortBy: 'password', sortOrder: 'desc' },
      ['createdAt'],
      'createdAt',
    );
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('computes totalPages with ceil', () => {
    const page = toOffsetPage([{ id: 'a' }], 21, { page: 1, pageSize: 10, sortOrder: 'desc' });
    expect(page).toEqual({
      items: [{ id: 'a' }],
      total: 21,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    });
  });
});
