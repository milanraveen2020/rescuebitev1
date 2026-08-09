'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, CircleAlert, Clock, FileText, QrCode, User } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { OrderStatusBadge } from '@/components/StatusBadge';
import { BottomSheet, ConfirmationBottomSheet } from '@/components/BottomSheet';
import { QRScanner } from '@/components/QRScanner';
import { Card } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { useOrders } from '@/features/orders/OrdersContext';
import { useToast } from '@/components/Toast';
import { useOnline } from '@/lib/useOnline';

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const { findOrder, collect, phase } = useOrders();
  const { show } = useToast();
  const online = useOnline();

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const order = findOrder(params.orderId);

  if (!order) {
    return (
      <>
        <AppHeader title="Order" backHref="/orders" />
        <div className="p-4">
          <EmptyState
            icon={CircleAlert}
            title={phase === 'loading' ? 'Loading order…' : 'Order not found'}
            description={
              phase === 'loading' ? undefined : 'This order is no longer on the counter list.'
            }
          />
        </div>
      </>
    );
  }

  const completed = order.orderStatus === 'completed';

  /** The scanned code is held locally; the server does the real validation. */
  function onToken(token: string) {
    const code = token.trim().toUpperCase();
    if (!code) return;
    setScanError(null);
    setPendingCode(code);
    setScanOpen(false);
  }

  async function confirmHandover() {
    if (!order || !pendingCode) return;
    setWorking(true);
    const res = await collect(order.id, pendingCode);
    setWorking(false);
    setPendingCode(null);
    show(
      res.ok
        ? { kind: 'success', title: 'Handover complete', description: order.referenceNumber }
        : { kind: 'error', title: 'Could not complete', description: res.message },
    );
    if (!res.ok) {
      setScanError(res.message);
      setScanOpen(true);
    }
  }

  return (
    <>
      <AppHeader title={order.referenceNumber} subtitle="Order details" backHref="/orders" />

      <div className="space-y-4 p-4 pb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <OrderStatusBadge status={order.orderStatus} />
            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatDate(order.purchasedAt)} · {formatTime(order.purchasedAt)}
            </span>
          </div>
        </Card>

        {/* Customer */}
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
            <User className="h-4 w-4 text-brand-600" aria-hidden />
            Customer
          </h2>
          <p className="font-display text-lg font-bold text-neutral-900">{order.customerName}</p>
        </Card>

        {/* Package + pricing */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
            {order.packageName}
          </h2>
          <dl className="space-y-2.5 text-sm">
            <Row label="Quantity" value={`${order.quantity} bag${order.quantity > 1 ? 's' : ''}`} />
            <Row label="Price each" value={formatMoney(order.unitPrice, 'LKR')} />
            <div className="my-1 border-t border-neutral-100" />
            <Row label="Total paid" value={formatMoney(order.totalPaid, 'LKR')} strong />
          </dl>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-raised p-3 text-xs text-neutral-500">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            <span>Ask the customer for their pickup code, then confirm the handover.</span>
          </div>
        </Card>

        {completed ? (
          <Card className="border-success-500/20 bg-success-50 p-4">
            <div className="flex items-center gap-2 text-success-700">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
              <div>
                <p className="font-display font-bold">Handover completed</p>
                {order.completedAt ? (
                  <p className="text-sm">{formatTime(order.completedAt)}</p>
                ) : null}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-neutral-500" aria-hidden />
              <div>
                <p className="font-display font-bold text-neutral-900">Scan the pickup code</p>
                <p className="text-sm text-neutral-500">
                  The code is verified by the server as the bag is handed over.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!online}
              onClick={() => {
                setScanError(null);
                setScanOpen(true);
              }}
              className="tap mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white transition hover:bg-brand-800 disabled:opacity-55"
            >
              <QrCode className="h-5 w-5" aria-hidden />
              Scan / enter code
            </button>
            {!online ? (
              <p className="mt-2 text-center text-xs text-warning-700">
                Offline — handovers need the server to verify the code.
              </p>
            ) : null}
          </Card>
        )}
      </div>

      {/* Scan sheet */}
      <BottomSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        title="Pickup code"
        description={`Scan or type the code for ${order.referenceNumber}.`}
      >
        {scanError ? (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700"
          >
            {scanError}
          </p>
        ) : null}
        <QRScanner onToken={onToken} />
      </BottomSheet>

      {/* Confirm handover — this is what actually calls the API */}
      <ConfirmationBottomSheet
        open={pendingCode !== null}
        onClose={() => setPendingCode(null)}
        title="Complete handover?"
        description="Have you handed over the correct package and quantity to the customer?"
        confirmLabel="Confirm Handover"
        loading={working}
        onConfirm={() => void confirmHandover()}
      >
        <div className="rounded-lg bg-surface-raised p-3 text-sm text-neutral-600">
          {order.customerName} · {order.packageName} × {order.quantity}
          <span className="mt-1 block font-mono text-xs text-neutral-500">Code: {pendingCode}</span>
        </div>
      </ConfirmationBottomSheet>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={cn(
          strong
            ? 'font-display text-base font-extrabold text-brand-800'
            : 'font-semibold text-neutral-900',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
