'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, EyeOff, Package, Plus, Rocket, Sun } from 'lucide-react';
import type { Listing } from '@rescuebite/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageBody,
  PageHeader,
  SearchInput,
  Section,
  Select,
  TableSkeleton,
  Toolbar,
  useToast,
} from '@rescuebite/ui/web';
import {
  ListingApiError,
  duplicateListing,
  listMyListings,
  publishForToday,
  publishListing,
  unpublishListing,
} from '@/features/listings/api';
import { formatMoney, humanize } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; listings: Listing[] }
  | { status: 'error'; message: string };

const STATUS_TONE: Record<Listing['status'], 'neutral' | 'success' | 'accent' | 'danger'> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  SOLD_OUT: 'accent',
  EXPIRED: 'danger',
};

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'DRAFT', 'SOLD_OUT', 'EXPIRED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function ListingsPage() {
  const { toast } = useToast();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const load = useCallback(() => {
    setState({ status: 'loading' });
    listMyListings()
      .then((listings) => setState({ status: 'ready', listings }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ListingApiError ? e.message : 'Could not load listings.',
        }),
      );
  }, []);

  useEffect(load, [load]);

  // Memoised so the filter below has a stable dependency across renders.
  const all = useMemo(() => (state.status === 'ready' ? state.listings : []), [state]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (l) =>
        (status === 'ALL' || l.status === status) &&
        (term === '' || l.title.toLowerCase().includes(term)),
    );
  }, [all, search, status]);

  async function run(id: string, action: () => Promise<unknown>, ok: string, fail: string) {
    setBusyId(id);
    try {
      await action();
      toast(ok, 'success');
      load();
    } catch (e) {
      toast(e instanceof ListingApiError ? e.message : fail, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = search.trim() !== '' || status !== 'ALL';

  return (
    <PageBody>
      <PageHeader
        title="Listings"
        description="Surprise bags customers can reserve. Only live listings reach customers and the counter."
        actions={
          <Link
            href="/listings/new"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-600 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New listing
          </Link>
        }
      />

      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'loading' ? (
        <Section bodyClassName="p-0" title="All listings">
          <TableSkeleton rows={4} columns={3} />
        </Section>
      ) : null}

      {state.status === 'ready' ? (
        all.length === 0 ? (
          <Section>
            <EmptyState
              icon={<Package className="h-[2rem] w-[2rem]" aria-hidden />}
              title="No listings yet"
              description="Create your first surprise bag, then publish it so customers can reserve it."
              action={
                <Link
                  href="/listings/new"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-600 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  New listing
                </Link>
              }
            />
          </Section>
        ) : (
          <>
            <Toolbar
              trailing={
                <span className="nums text-sm text-muted-foreground">
                  {visible.length} of {all.length}
                </span>
              }
            >
              <div className="sm:w-72">
                <SearchInput
                  label="Search listings"
                  placeholder="Search by title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />
              </div>
              <div className="sm:w-52">
                <Select
                  label="Status"
                  hideLabel
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>
                      {s === 'ALL' ? 'All statuses' : humanize(s)}
                    </option>
                  ))}
                </Select>
              </div>
            </Toolbar>

            <Section bare>
              {visible.length === 0 ? (
                <div className="rounded-lg border border-line bg-surface-card">
                  <EmptyState
                    title="No matching listings"
                    description="Try a different search term or status filter."
                    action={
                      filtered ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearch('');
                            setStatus('ALL');
                          }}
                        >
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface-card">
                  {visible.map((l) => {
                    const busy = busyId === l.id;
                    const live = l.status === 'ACTIVE';
                    const toggleable = live || l.status === 'DRAFT';
                    const sold = l.quantityTotal - l.quantityRemaining;
                    return (
                      <li
                        key={l.id}
                        className="flex flex-col gap-3 p-4 transition hover:bg-surface-raised/50 xl:flex-row xl:items-center xl:gap-6"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-neutral-900">{l.title}</p>
                            <Badge tone={STATUS_TONE[l.status]} dot>
                              {humanize(l.status)}
                            </Badge>
                          </div>
                          <p className="nums mt-1 text-sm text-muted-foreground">
                            <span className="font-semibold text-neutral-800">
                              {formatMoney(l.price, l.currency)}
                            </span>
                            <span className="mx-1.5 text-line-strong">·</span>
                            {l.discountPercent}% off
                            <span className="mx-1.5 text-line-strong">·</span>
                            {l.quantityRemaining}/{l.quantityTotal} left
                            {sold > 0 ? (
                              <>
                                <span className="mx-1.5 text-line-strong">·</span>
                                {sold} sold
                              </>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
                          {toggleable ? (
                            <Button
                              size="sm"
                              variant={live ? 'outline' : 'primary'}
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  l.id,
                                  () => (live ? unpublishListing(l.id) : publishListing(l.id)),
                                  live ? 'Listing moved back to draft.' : 'Listing is live.',
                                  live ? 'Could not unpublish.' : 'Could not publish.',
                                )
                              }
                              title={
                                live
                                  ? 'Move this listing back to a draft'
                                  : 'Take this listing live on its own pickup window'
                              }
                            >
                              {live ? (
                                <>
                                  <EyeOff className="h-4 w-4" aria-hidden />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Rocket className="h-4 w-4" aria-hidden />
                                  Publish
                                </>
                              )}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            title="Publish a fresh live copy on today's pickup window"
                            onClick={() =>
                              void run(
                                l.id,
                                () => publishForToday(l),
                                'Published live for today.',
                                'Could not publish.',
                              )
                            }
                          >
                            <Sun className="h-4 w-4" aria-hidden />
                            Today
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            title="Duplicate as a draft"
                            onClick={() =>
                              void run(
                                l.id,
                                () => duplicateListing(l),
                                'Listing duplicated as a draft.',
                                'Could not duplicate.',
                              )
                            }
                          >
                            <Copy className="h-4 w-4" aria-hidden />
                            Duplicate
                          </Button>
                          <Link
                            href={`/listings/${l.id}/edit`}
                            className="inline-flex min-h-[2.25rem] items-center rounded-md px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                          >
                            Edit
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </>
        )
      ) : null}
    </PageBody>
  );
}
