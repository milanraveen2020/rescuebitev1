'use client';

import { useState } from 'react';
import { StoreStatusSchema, type AdminStore } from '@rescuebite/types';
import { Button, Modal, useToast } from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import { approveStore, listStores, rejectStore, type StoreQuery } from '@/features/stores/api';
import { ApiRequestError } from '@/lib/request';
import { formatDate, humanize } from '@/lib/format';

type StoreFilters = Pick<StoreQuery, 'search' | 'status'>;

export default function StoresPage() {
  const { toast } = useToast();
  const { state, query, filters, setSort, setPage, setFilter, reload } = usePagedData<
    AdminStore,
    StoreFilters
  >(listStores, { search: '', status: '' });
  const [detail, setDetail] = useState<AdminStore | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminStore | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function onApprove(store: AdminStore): Promise<void> {
    try {
      await approveStore(store.id);
      toast(`${store.name} approved.`, 'success');
      setDetail(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not approve.', 'error');
    }
  }

  async function onReject(): Promise<void> {
    if (!rejectTarget) return;
    setBusy(true);
    try {
      await rejectStore(rejectTarget.id, reason);
      toast(`${rejectTarget.name} rejected.`, 'neutral');
      setRejectTarget(null);
      setReason('');
      setDetail(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not reject.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminStore>[] = [
    {
      key: 'name',
      header: 'Store',
      sortKey: 'name',
      render: (s) => (
        <button
          onClick={() => setDetail(s)}
          className="text-left font-medium text-brand-700 hover:underline"
        >
          {s.name}
        </button>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (s) => <span className="text-neutral-600">{s.ownerEmail}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'rating',
      header: 'Rating',
      sortKey: 'rating',
      align: 'right',
      render: (s) => s.rating.toFixed(1),
    },
    { key: 'listings', header: 'Listings', align: 'right', render: (s) => s.listingCount },
    { key: 'orders', header: 'Orders', align: 'right', render: (s) => s.orderCount },
    {
      key: 'created',
      header: 'Joined',
      sortKey: 'createdAt',
      render: (s) => formatDate(s.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Stores</h1>
        <p className="text-sm text-muted-foreground">Moderate stores across the platform.</p>
      </div>

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search name or address',
        }}
        selects={[
          {
            label: 'Status',
            value: filters.status ?? '',
            onChange: (v) => setFilter('status', v),
            options: StoreStatusSchema.options.map((s) => ({ value: s, label: humanize(s) })),
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(s) => s.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No stores match your filters."
      />

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail ? (
          <div className="space-y-3 text-sm">
            <Row label="Status" value={<StatusBadge status={detail.status} />} />
            <Row label="Owner" value={`${detail.ownerName} · ${detail.ownerEmail}`} />
            <Row label="Category" value={humanize(detail.category)} />
            <Row label="Address" value={detail.address} />
            <Row label="Payouts" value={detail.payoutsEnabled ? 'Enabled' : 'Not enabled'} />
            <Row label="Stripe" value={detail.stripeAccountId ?? 'Not connected'} />
            <Row
              label="Listings / Orders"
              value={`${detail.listingCount} / ${detail.orderCount}`}
            />
            {detail.status === 'PENDING' ? (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setRejectTarget(detail)}>
                  Reject
                </Button>
                <Button onClick={() => void onApprove(detail)}>Approve</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={rejectTarget !== null}
        title="Reject store"
        confirmLabel="Reject"
        destructive
        loading={busy}
        reason={{ label: 'Reason', value: reason, onChange: setReason, required: true }}
        onConfirm={() => void onReject()}
        onClose={() => {
          setRejectTarget(null);
          setReason('');
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-800">{value}</span>
    </div>
  );
}
