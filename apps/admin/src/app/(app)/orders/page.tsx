'use client';

import { useState } from 'react';
import { OrderStatusSchema, type AdminOrder } from '@rescuebite/types';
import { Button, Modal, useToast } from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import { listOrders, refundOrder, type OrderQuery } from '@/features/orders/api';
import { ApiRequestError } from '@/lib/request';
import { formatDateTime, formatMoney, humanize } from '@/lib/format';

type OrderFilters = Pick<OrderQuery, 'search' | 'status'>;

export default function OrdersPage() {
  const { toast } = useToast();
  const { state, query, filters, setSort, setPage, setFilter, reload } = usePagedData<
    AdminOrder,
    OrderFilters
  >(listOrders, { search: '', status: '' });
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null);
  const [busy, setBusy] = useState(false);

  const refundable = (o: AdminOrder) => o.status === 'PAID' || o.status === 'COLLECTED';

  async function onRefund(): Promise<void> {
    if (!refundTarget) return;
    setBusy(true);
    try {
      await refundOrder(refundTarget.id);
      toast('Refund issued.', 'success');
      setRefundTarget(null);
      setDetail(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not issue refund.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminOrder>[] = [
    {
      key: 'code',
      header: 'Order',
      render: (o) => (
        <button onClick={() => setDetail(o)} className="text-left">
          <span className="font-mono font-medium text-brand-700">{o.pickupCode}</span>
          <p className="text-xs text-neutral-500">{o.listingTitle}</p>
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => <span className="text-neutral-600">{o.customerEmail}</span>,
    },
    { key: 'store', header: 'Store', render: (o) => o.storeName },
    {
      key: 'total',
      header: 'Total',
      sortKey: 'totalAmount',
      align: 'right',
      render: (o) => formatMoney(o.totalAmount, o.currency),
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'created',
      header: 'Placed',
      sortKey: 'createdAt',
      render: (o) => formatDateTime(o.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) =>
        refundable(o) ? (
          <Button size="sm" variant="ghost" onClick={() => setRefundTarget(o)}>
            Refund
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Search orders, inspect payments, and issue refunds.
        </p>
      </div>

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search code, customer, or store',
        }}
        selects={[
          {
            label: 'Status',
            value: filters.status ?? '',
            onChange: (v) => setFilter('status', v),
            options: OrderStatusSchema.options.map((s) => ({ value: s, label: humanize(s) })),
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(o) => o.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No orders match your filters."
      />

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`Order ${detail?.pickupCode ?? ''}`}
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <Row label="Status" value={<StatusBadge status={detail.status} />} />
            <Row label="Customer" value={`${detail.customerName} · ${detail.customerEmail}`} />
            <Row label="Store" value={detail.storeName} />
            <Row label="Item" value={`${detail.quantity}× ${detail.listingTitle}`} />
            <Row label="Total" value={formatMoney(detail.totalAmount, detail.currency)} />
            <Row label="Placed" value={formatDateTime(detail.createdAt)} />
            <Row
              label="Stripe intent"
              value={detail.stripePaymentIntentId ?? 'No payment intent'}
            />
            {refundable(detail) ? (
              <div className="flex justify-end pt-2">
                <Button variant="danger" onClick={() => setRefundTarget(detail)}>
                  Issue refund
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={refundTarget !== null}
        title="Issue refund"
        message={`Refund ${refundTarget ? formatMoney(refundTarget.totalAmount, refundTarget.currency) : ''} to the customer? This cannot be undone.`}
        confirmLabel="Refund"
        destructive
        loading={busy}
        onConfirm={() => void onRefund()}
        onClose={() => setRefundTarget(null)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="break-all text-right font-medium text-neutral-800">{value}</span>
    </div>
  );
}
