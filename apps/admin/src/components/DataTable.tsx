'use client';

import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@rescuebite/ui/web';
import type { PagedQuery, TableState } from './usePagedData';

export interface Column<T> {
  key: string;
  header: string;
  /** Pass the server sort field name to make the column header sortable. */
  sortKey?: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  state: TableState<T>;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  query: PagedQuery;
  onSort: (sortKey: string) => void;
  onPage: (page: number) => void;
  emptyMessage?: string;
  /** Optional row selection for bulk actions. */
  selection?: {
    selected: Set<string>;
    onToggle: (id: string) => void;
    onToggleAll: (ids: string[]) => void;
    actions: ReactNode;
  };
}

/**
 * Dense, sticky-header data table with server-side pagination and sorting.
 * Handles loading, empty, and error states inline.
 */
export function DataTable<T>({
  state,
  columns,
  getRowId,
  query,
  onSort,
  onPage,
  emptyMessage = 'Nothing to show.',
  selection,
}: DataTableProps<T>) {
  const rows = state.status === 'ready' ? state.page.items : [];
  const allIds = rows.map(getRowId);
  const allSelected = selection
    ? allIds.length > 0 && allIds.every((id) => selection.selected.has(id))
    : false;
  const colSpan = columns.length + (selection ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {selection && selection.selected.size > 0 ? (
        <div className="flex items-center gap-3 border-b border-neutral-200 bg-brand-50 px-4 py-2">
          <span className="text-sm font-medium text-brand-800">
            {selection.selected.size} selected
          </span>
          <div className="flex gap-2">{selection.actions}</div>
        </div>
      ) : null}

      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-neutral-50">
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              {selection ? (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    onChange={() => selection.onToggleAll(allIds)}
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const active = col.sortKey && query.sortBy === col.sortKey;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-3 py-2.5 font-semibold',
                      col.align === 'right' && 'text-right',
                    )}
                  >
                    {col.sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.sortKey as string)}
                        className="inline-flex items-center gap-1 hover:text-neutral-800"
                      >
                        {col.header}
                        {active ? (
                          query.sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {state.status === 'loading' ? (
              <RowMessage colSpan={colSpan}>Loading…</RowMessage>
            ) : null}
            {state.status === 'error' ? (
              <RowMessage colSpan={colSpan} tone="error">
                {state.message}
              </RowMessage>
            ) : null}
            {state.status === 'ready' && rows.length === 0 ? (
              <RowMessage colSpan={colSpan}>{emptyMessage}</RowMessage>
            ) : null}
            {rows.map((row) => {
              const id = getRowId(row);
              const checked = selection?.selected.has(id) ?? false;
              return (
                <tr
                  key={id}
                  className={cn(
                    'border-b border-neutral-100 last:border-0 hover:bg-neutral-50',
                    checked && 'bg-brand-50/50',
                  )}
                >
                  {selection ? (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={checked}
                        onChange={() => selection.onToggle(id)}
                      />
                    </td>
                  ) : null}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-2.5 align-middle text-neutral-700',
                        col.align === 'right' && 'text-right',
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state.status === 'ready' ? (
        <Pagination
          page={state.page.page}
          totalPages={state.page.totalPages}
          total={state.page.total}
          onPage={onPage}
        />
      ) : null}
    </div>
  );
}

function RowMessage({
  colSpan,
  children,
  tone,
}: {
  colSpan: number;
  children: ReactNode;
  tone?: 'error';
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          'px-3 py-10 text-center',
          tone === 'error' ? 'text-danger-600' : 'text-neutral-500',
        )}
      >
        {children}
      </td>
    </tr>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5 text-sm text-neutral-500">
      <span>
        {total} result{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
