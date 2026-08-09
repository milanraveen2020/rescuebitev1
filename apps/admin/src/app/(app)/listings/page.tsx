'use client';

import { useState } from 'react';
import { ListingStatusSchema, type AdminListing } from '@rescuebite/types';
import { Badge, Button, Modal, PageBody, PageHeader, useToast } from '@rescuebite/ui/web';
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
  const [detail, setDetail] = useState<AdminListing | null>(null);
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
        <button onClick={() => setDetail(l)} className="text-left">
          <p className="font-medium text-brand-700 hover:underline">{l.title}</p>
          <p className="text-xs text-muted-foreground">{l.storeName}</p>
        </button>
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
    <PageBody>
      <PageHeader title="Listings" description="Moderate and force-unpublish flagged listings." />

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search title',
        }}
        selects={[
          {
            label: 'Status',
            allLabel: 'All statuses',
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
        onRetry={reload}
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

      {/*
        Moderation needs the customer-facing content, not just the row summary:
        the description, allergen text, and photo are exactly what an admin is
        being asked to judge, and none of it was visible anywhere in this console.
      */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail ? (
          <div className="space-y-4 text-sm">
            {detail.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.imageUrl}
                alt={`${detail.title} photo`}
                className="h-40 w-full rounded-md border border-line object-cover"
              />
            ) : (
              <p className="rounded-md border border-dashed border-line-strong bg-surface-raised p-4 text-center text-xs text-muted-foreground">
                No photo — this bag shows a blank hero in the app.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <Badge tone="neutral">{humanize(detail.category)}</Badge>
              <Badge tone={detail.quantityRemaining > 0 ? 'success' : 'warning'}>
                {detail.quantityRemaining}/{detail.quantityTotal} left
              </Badge>
              <Badge tone="info">{detail.discountPercent}% off</Badge>
            </div>

            <DetailRow label="Store" value={detail.storeName} />
            <DetailRow
              label="Price"
              value={`${formatMoney(detail.price, detail.currency)} (was ${formatMoney(
                detail.originalPrice,
                detail.currency,
              )})`}
            />
            <DetailRow
              label="Pickup window"
              value={`${new Date(detail.pickupStart).toLocaleString()} → ${new Date(
                detail.pickupEnd,
              ).toLocaleString()}`}
            />
            <DetailRow
              label="Description"
              value={detail.description ?? 'None — the app falls back to generic copy.'}
            />
            <DetailRow
              label="Allergens"
              value={detail.allergenInfo ?? 'None provided — no allergen section shows in the app.'}
            />
          </div>
        ) : null}
      </Modal>
    </PageBody>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line pb-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-neutral-800">{value}</dd>
    </div>
  );
}
