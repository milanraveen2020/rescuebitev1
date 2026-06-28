'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SortOrder } from '@rescuebite/types';
import { ApiRequestError } from '@/lib/request';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
}

type Filters = Record<string, string | boolean | undefined>;

export type TableState<T> =
  { status: 'loading' } | { status: 'ready'; page: Page<T> } | { status: 'error'; message: string };

interface Options {
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * Server-side pagination + sorting + filtering for an admin table. Re-fetches
 * whenever the query or filters change; changing a filter resets to page 1.
 */
export function usePagedData<T, F extends Filters>(
  fetcher: (query: PagedQuery & F) => Promise<Page<T>>,
  initialFilters: F,
  options: Options = {},
) {
  const [query, setQuery] = useState<PagedQuery>({
    page: 1,
    pageSize: options.pageSize ?? 20,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder ?? 'desc',
  });
  const [filters, setFiltersState] = useState<F>(initialFilters);
  const [state, setState] = useState<TableState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    fetcher({ ...query, ...filters })
      .then((page) => active && setState({ status: 'ready', page }))
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ApiRequestError ? e.message : 'Could not load data.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters, nonce]);

  const setPage = (page: number) => setQuery((q) => ({ ...q, page }));

  const setSort = (sortBy: string) =>
    setQuery((q) => ({
      ...q,
      sortBy,
      sortOrder: q.sortBy === sortBy && q.sortOrder === 'desc' ? 'asc' : 'desc',
    }));

  const setFilter = (key: keyof F, value: F[keyof F]) => {
    setFiltersState((f) => ({ ...f, [key]: value }));
    setQuery((q) => ({ ...q, page: 1 }));
  };

  return { state, query, filters, setPage, setSort, setFilter, reload };
}
