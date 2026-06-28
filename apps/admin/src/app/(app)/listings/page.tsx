'use client';

import { useState } from 'react';
import { ListingStatusSchema, type AdminListing } from '@rescuebite/types';
import { Button, useToast } from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import {
  bulkUnpublishListings,
  listListings,
  unpublishListing,
  type ListingQuery,
} from '@/features/listings/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney, humanize } from '@/lib/format';

type ListingFilters = Pick<ListingQuery, 'search' | 'status'>;

export default function ListingsPage() {
  const { toast } = useToast();
  const { state, query, filters, setSort, setPage, setFilter, reload } = usePagedData<
    AdminListing,
    ListingFilters
  >(listListings, { search: '', status: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unpublishTarget, setUnpublishTarget] = useState<AdminListing | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(ids: string[]): void {
    setSelected((prev) => (ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)));
  }

  async function onUnpublish(): Promise<void> {
    if (!unpublishTarget) return;
    setBusy(true);
    try {
      await unpublishListing(unpublishTarget.id);
      toast('Listing unpublished.', 'neutral');
      setUnpublishTarget(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not unpublish.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(): Promise<void> {
    setBusy(true);
    try {
      const { affected } = await bulkUnpublishListings([...selected]);
      toast(`Unpublished ${affected} listing${affected === 1 ? '' : 's'}.`, 'neutral');
      setSelected(new Set());
      setBulkOpen(false);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Bulk action failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminListing>[] = [
    {
      key: 'title',
      header: 'Listing',
      sortKey: 'title',
      render: (l) => (
        <div>
          <p className="font-medium text-neutral-900">{l.title}</p>
          <p className="text-xs text-neutral-500">{l.storeName}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (l) => humanize(l.category) },
    {
      key: 'price',
      header: 'Price',
      sortKey: 'price',
      align: 'right',
      render: (l) => formatMoney(l.price, l.currency),
    },
    {
      key: 'qty',
      header: 'Stock',
      align: 'right',
      render: (l) => `${l.quantityRemaining}/${l.quantityTotal}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (l) => <StatusBadge status={l.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) =>
        l.status !== 'EXPIRED' ? (
          <Button size="sm" variant="danger" onClick={() => setUnpublishTarget(l)}>
            Unpublish
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Listings</h1>
        <p className="text-sm text-muted-foreground">
          Moderate and force-unpublish flagged listings.
        </p>
      </div>

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search title',
        }}
        selects={[
          {
            label: 'Status',
            value: filters.status ?? '',
            onChange: (v) => setFilter('status', v),
            options: ListingStatusSchema.options.map((s) => ({ value: s, label: humanize(s) })),
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(l) => l.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No listings match your filters."
        selection={{
          selected,
          onToggle: toggle,
          onToggleAll: toggleAll,
          actions: (
            <Button size="sm" variant="danger" onClick={() => setBulkOpen(true)}>
              Unpublish selected
            </Button>
          ),
        }}
      />

      <ConfirmDialog
        open={unpublishTarget !== null}
        title="Unpublish listing"
        message="This removes the listing from discovery. It cannot be re-published by the merchant."
        confirmLabel="Unpublish"
        destructive
        loading={busy}
        onConfirm={() => void onUnpublish()}
        onClose={() => setUnpublishTarget(null)}
      />
      <ConfirmDialog
        open={bulkOpen}
        title="Unpublish selected listings"
        message={`Unpublish ${selected.size} listing(s)?`}
        confirmLabel="Unpublish all"
        destructive
        loading={busy}
        onConfirm={() => void onBulk()}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
