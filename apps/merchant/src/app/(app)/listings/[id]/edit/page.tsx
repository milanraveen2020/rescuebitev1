'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Listing } from '@rescuebite/types';
import { BlockSkeleton, ErrorState, PageBody } from '@rescuebite/ui/web';
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
    return (
      <PageBody>
        <BlockSkeleton lines={2} />
        <div className="grid gap-6 xl:grid-cols-2">
          <BlockSkeleton lines={5} />
          <BlockSkeleton lines={5} />
        </div>
      </PageBody>
    );
  }
  if (state.status === 'error') {
    return (
      <PageBody>
        <ErrorState message={state.message} onRetry={() => window.location.reload()} />
      </PageBody>
    );
  }
  return <ListingForm mode="edit" initial={state.listing} />;
}
