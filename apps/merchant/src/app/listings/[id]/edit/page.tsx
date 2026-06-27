'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Listing } from '@rescuebite/types';
import { ListingForm } from '@/features/listings/ListingForm';
import { getMyListing, ListingApiError } from '@/features/listings/api';

type State =
  | { status: 'loading' }
  | { status: 'ready'; listing: Listing }
  | { status: 'error'; message: string };

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getMyListing(params.id)
      .then((listing) => active && setState({ status: 'ready', listing }))
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ListingApiError ? e.message : 'Could not load the listing.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, [params.id]);

  if (state.status === 'loading') {
    return <p className="p-6 text-muted-foreground">Loading…</p>;
  }
  if (state.status === 'error') {
    return <p className="p-6 text-red-600">{state.message}</p>;
  }
  return <ListingForm mode="edit" initial={state.listing} />;
}
