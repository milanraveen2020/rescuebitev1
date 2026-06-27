'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Listing } from '@rescuebite/types';
import { ListingApiError, listMyListings } from '@/features/listings/api';

type State =
  | { status: 'loading' }
  | { status: 'ready'; listings: Listing[] }
  | { status: 'error'; message: string };

const STATUS_STYLES: Record<Listing['status'], string> = {
  ACTIVE: 'bg-brand-100 text-brand-800',
  DRAFT: 'bg-neutral-100 text-neutral-700',
  SOLD_OUT: 'bg-accent-100 text-accent-700',
  EXPIRED: 'bg-red-50 text-red-600',
};

export default function ListingsPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    listMyListings()
      .then((listings) => active && setState({ status: 'ready', listings }))
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ListingApiError ? e.message : 'Could not load listings.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-brand-700">Your listings</h1>
        <Link
          href="/listings/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          New listing
        </Link>
      </header>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-red-600">{state.message}</p> : null}
      {state.status === 'ready' && state.listings.length === 0 ? (
        <p className="text-muted-foreground">No listings yet. Create your first surprise bag.</p>
      ) : null}

      {state.status === 'ready' && state.listings.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {state.listings.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-neutral-900">{l.title}</p>
                <p className="text-sm text-muted-foreground">
                  €{(l.price / 100).toFixed(2)} · {l.discountPercent}% off · {l.quantityRemaining}/
                  {l.quantityTotal} left
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[l.status]}`}>
                  {l.status}
                </span>
                <Link href={`/listings/${l.id}/edit`} className="text-sm font-medium text-brand-600">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
