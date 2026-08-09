'use client';

import { ArrowDownUp, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/lib/types';

export type StatusFilter = OrderStatus | 'all';
export type SortOrder = 'newest' | 'oldest';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
];

export function SearchAndFilter({
  query,
  onQuery,
  status,
  onStatus,
  sort,
  onSort,
  counts,
}: {
  query: string;
  onQuery: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  sort: SortOrder;
  onSort: (value: SortOrder) => void;
  counts?: Partial<Record<StatusFilter, number>>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search order, name, or phone"
            aria-label="Search orders"
            className="h-11 w-full rounded-lg border border-neutral-300 bg-surface-card pl-9 pr-9 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label="Clear search"
              className="tap absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onSort(sort === 'newest' ? 'oldest' : 'newest')}
          aria-label={`Sort by ${sort === 'newest' ? 'oldest' : 'newest'} first`}
          className="tap flex h-11 items-center gap-1.5 rounded-lg border border-neutral-300 bg-surface-card px-3 text-xs font-semibold text-neutral-700 hover:bg-surface-raised"
        >
          <ArrowDownUp className="h-4 w-4" aria-hidden />
          {sort === 'newest' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar"
        role="group"
        aria-label="Filter by status"
      >
        {FILTERS.map((f) => {
          const active = status === f.value;
          const count = counts?.[f.value];
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => onStatus(f.value)}
              className={cn(
                'tap shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition',
                active
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-neutral-300 bg-surface-card text-neutral-600 hover:bg-surface-raised',
              )}
            >
              {f.label}
              {typeof count === 'number' ? (
                <span className={cn('ml-1.5', active ? 'text-brand-100' : 'text-neutral-400')}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
