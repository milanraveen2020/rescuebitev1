'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Sun } from 'lucide-react';
import type { Listing } from '@rescuebite/types';
import { Badge, useToast } from '@rescuebite/ui/web';
import {
  ListingApiError,
  duplicateListing,
  listMyListings,
  publishForToday,
} from '@/features/listings/api';
import { formatMoney, humanize } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; listings: Listing[] }
  | { status: 'error'; message: string };

const STATUS_TONE: Record<Listing['status'], 'neutral' | 'brand' | 'accent' | 'danger'> = {
  ACTIVE: 'brand',
  DRAFT: 'neutral',
  SOLD_OUT: 'accent',
  EXPIRED: 'danger',
};

export default function ListingsPage() {
  const { toast } = useToast();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);

  function load(): void {
    listMyListings()
      .then((listings) => setState({ status: 'ready', listings }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ListingApiError ? e.message : 'Could not load listings.',
        }),
      );
  }

  useEffect(load, []);

  async function onDuplicate(listing: Listing): Promise<void> {
    setBusyId(listing.id);
    try {
      await duplicateListing(listing);
      toast('Listing duplicated as a draft.', 'success');
      load();
    } catch (e) {
      toast(e instanceof ListingApiError ? e.message : 'Could not duplicate.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function onPublishToday(listing: Listing): Promise<void> {
    setBusyId(listing.id);
    try {
      await publishForToday(listing);
      toast('Published live for today.', 'success');
      load();
    } catch (e) {
      toast(e instanceof ListingApiError ? e.message : 'Could not publish.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Listings</h1>
        <Link
          href="/listings/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New listing
        </Link>
      </header>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-danger-600">{state.message}</p> : null}
      {state.status === 'ready' && state.listings.length === 0 ? (
        <p className="text-muted-foreground">No listings yet. Create your first surprise bag.</p>
      ) : null}

      {state.status === 'ready' && state.listings.length > 0 ? (
        <ul className="divide-y rounded-lg border bg-white">
          {state.listings.map((l) => {
            const busy = busyId === l.id;
            return (
              <li
                key={l.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900">{l.title}</p>
                    <Badge tone={STATUS_TONE[l.status]}>{humanize(l.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(l.price, l.currency)} · {l.discountPercent}% off ·{' '}
                    {l.quantityRemaining}/{l.quantityTotal} left
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void onPublishToday(l)}
                    disabled={busy}
                    title="Publish a live copy for today"
                    className="flex min-h-9 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                  >
                    <Sun className="h-4 w-4" aria-hidden />
                    Today
                  </button>
                  <button
                    onClick={() => void onDuplicate(l)}
                    disabled={busy}
                    title="Duplicate as a draft"
                    className="flex min-h-9 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    Duplicate
                  </button>
                  <Link
                    href={`/listings/${l.id}/edit`}
                    className="min-h-9 px-3 text-sm font-medium leading-9 text-brand-600"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
