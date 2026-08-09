'use client';

import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Button, Checkbox, EmptyState, ErrorState, TableSkeleton, cn } from '@rescuebite/ui/web';
import type { PagedQuery, TableState } from './usePagedData';

export interface Column<T> {
  key: string;
  header: string;
  /** Pass the server sort field name to make the column header sortable. */
  sortKey?: string;
  align?: 'left' | 'right';
  /** Hide below this breakpoint so narrow screens keep the important columns. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Keeps a column from being squeezed by long neighbours. */
  width?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  state: TableState<T>;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  query: PagedQuery;
  onSort: (sortKey: string) => void;
  onPage: (page: number) => void;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyDescription?: string;
  /** Optional row selection for bulk actions. */
  selection?: {
    selected: Set<string>;
    onToggle: (id: string) => void;
    onToggleAll: (ids: string[]) => void;
    actions: ReactNode;
  };
}

const HIDE_BELOW = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const;

/**
 * Server-paginated data table.
 *
 * Reworked for readability at admin scale: taller rows and a wider gutter so
 * values are not touching cell edges, a real header treatment separated from the
 * body, sort affordances visible on every sortable column (not only the active
 * one), skeleton rows instead of a single "Loading…" cell so the layout doesn't
 * jump, and pagination controls at a 44px target. Columns can opt out at narrow
 * widths via `hideBelow` rather than forcing a horizontal scroll on mobile.
 */
export function DataTable<T>({
  state,
  columns,
  getRowId,
  query,
  onSort,
  onPage,
  onRetry,
  emptyMessage = 'Nothing to show.',
  emptyDescription,
  selection,
}: DataTableProps<T>) {
  const rows = state.status === 'ready' ? state.page.items : [];
  const allIds = rows.map(getRowId);
  const allSelected = selection
    ? allIds.length > 0 && allIds.every((id) => selection.selected.has(id))
    : false;
  const someSelected = selection
    ? allIds.some((id) => selection.selected.has(id)) && !allSelected
    : false;

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={onRetry} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-card shadow-sm">
      {/* Bulk-action bar only takes space once something is actually selected. */}
      {selection && selection.selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="nums text-sm font-semibold text-brand-800">
            {selection.selected.size} selected
          </span>
          <div className="flex flex-wrap gap-2">{selection.actions}</div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
              {selection ? (
                <th scope="col" className="w-12 px-4 py-3">
                  <Checkbox
                    label="Select all rows"
                    className="[&_span]:sr-only"
                    checked={allSelected}
                    ref={(el) => {
                      // Indeterminate is not expressible as a prop.
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={() => selection.onToggleAll(allIds)}
                  />
                </th>
              ) : null}
              {columns.map((col, i) => {
                const active = col.sortKey && query.sortBy === col.sortKey;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      active ? (query.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'whitespace-nowrap px-4 py-3 font-semibold',
                      col.align === 'right' && 'text-right',
                      col.hideBelow && HIDE_BELOW[col.hideBelow],
                      // The identifying column stays put while the rest scrolls,
                      // so you never lose track of which row you're looking at.
                      i === 0 && !selection && 'sticky left-0 z-10 bg-surface-raised',
                    )}
                  >
                    {col.sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.sortKey as string)}
                        className={cn(
                          // The UA stylesheet resets text-transform inside buttons,
                          // so re-declare it or sortable headers lose their casing
                          // and sit visually out of line with plain ones.
                          'group -mx-1 inline-flex min-h-[2rem] items-center gap-1.5 rounded px-1 uppercase tracking-wide transition hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                          col.align === 'right' && 'flex-row-reverse',
                          active && 'text-neutral-900',
                        )}
                      >
                        {col.header}
                        {active ? (
                          query.sortOrder === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          )
                        ) : (
                          // Always show the affordance so sortable columns are discoverable.
                          <ChevronsUpDown
                            className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60"
                            aria-hidden
                          />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {state.status === 'loading' ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="p-0">
                  <TableSkeleton rows={6} columns={Math.min(columns.length, 5)} />
                </td>
              </tr>
            ) : null}

            {state.status === 'ready' && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)}>
                  <EmptyState title={emptyMessage} description={emptyDescription} />
                </td>
              </tr>
            ) : null}

            {rows.map((row) => {
              const id = getRowId(row);
              const checked = selection?.selected.has(id) ?? false;
              return (
                <tr
                  key={id}
                  className={cn(
                    'group transition duration-fast',
                    checked ? 'bg-brand-50/60' : 'hover:bg-surface-raised/60',
                  )}
                >
                  {selection ? (
                    <td className="px-4 py-3">
                      <Checkbox
                        label="Select row"
                        className="[&_span]:sr-only"
                        checked={checked}
                        onChange={() => selection.onToggle(id)}
                      />
                    </td>
                  ) : null}
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 align-middle text-neutral-700',
                        col.align === 'right' && 'nums text-right',
                        col.hideBelow && HIDE_BELOW[col.hideBelow],
                        // Matches the sticky header column; needs its own background
                        // or scrolled cells show through underneath it.
                        i === 0 &&
                          !selection &&
                          cn(
                            // Opaque (not the row's translucent tint) so scrolled
                            // cells can't show through it.
                            'sticky left-0 z-10',
                            checked
                              ? 'bg-brand-50'
                              : 'bg-surface-card group-hover:bg-surface-raised',
                          ),
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
          pageSize={state.page.pageSize}
          totalPages={state.page.totalPages}
          total={state.page.total}
          onPage={onPage}
        />
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      {/* Concrete range beats a bare total when scanning a long list. */}
      <span className="nums">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <strong className="font-semibold text-neutral-800">{first}</strong>–
            <strong className="font-semibold text-neutral-800">{last}</strong> of{' '}
            <strong className="font-semibold text-neutral-800">{total}</strong>
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        <span className="nums hidden sm:inline">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
