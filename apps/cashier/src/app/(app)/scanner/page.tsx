'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, Clock, ShieldX } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { QRScanner } from '@/components/QRScanner';
import { Card, Button } from '@/components/ui';
import { OrderStatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { useOrders } from '@/features/orders/OrdersContext';
import { useToast } from '@/components/Toast';
import { useOnline } from '@/lib/useOnline';
import type { Order } from '@/lib/types';

type Result = { ok: true; order: Order } | { ok: false; message: string } | null;

export default function ScannerPage() {
  const router = useRouter();
  const { orders, collect } = useOrders();
  const { show } = useToast();
  const online = useOnline();
  const [result, setResult] = useState<Result>(null);
  const [working, setWorking] = useState(false);

  const waiting = orders.filter((o) => o.orderStatus === 'ready');

  async function onToken(token: string) {
    if (!online) {
      setResult({ ok: false, message: 'You’re offline — the server can’t verify this code yet.' });
      return;
    }
    const code = token.trim().toUpperCase();
    // Resolve the scanned code to one of this store's live orders, then let the
    // server do the authoritative validation on collect.
    const match = orders.find((o) => o.qrToken.toUpperCase() === code);
    if (!match) {
      setResult({ ok: false, message: 'No matching order for this code.' });
      return;
    }
    if (match.orderStatus === 'completed') {
      setResult({ ok: false, message: 'This code has already been used.' });
      return;
    }
    setWorking(true);
    const res = await collect(match.id, code);
    setWorking(false);
    if (res.ok) {
      setResult({ ok: true, order: match });
      show({ kind: 'success', title: 'Handover complete', description: match.customerName });
    } else {
      setResult({ ok: false, message: res.message });
    }
  }

  return (
    <>
      <AppHeader
        title="Scan code"
        subtitle="Validate a customer’s pickup"
        backHref="/session/active"
      />

      <div className="space-y-5 p-4 pb-8">
        {result?.ok ? (
          <Card className="border-success-500/20 bg-success-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success-600" aria-hidden />
            <h2 className="mt-3 font-display text-xl font-extrabold text-neutral-900">
              Handover complete
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {result.order.referenceNumber} · {result.order.customerName}
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" block onClick={() => setResult(null)}>
                Scan another
              </Button>
              <Button block onClick={() => router.push(`/orders/${result.order.id}`)}>
                Open order
              </Button>
            </div>
          </Card>
        ) : result && !result.ok ? (
          <Card className="border-danger-500/20 bg-danger-50 p-6 text-center">
            <ShieldX className="mx-auto h-14 w-14 text-danger-600" aria-hidden />
            <h2 className="mt-3 font-display text-xl font-extrabold text-neutral-900">
              Can’t verify
            </h2>
            <p role="alert" className="mt-1 text-sm text-danger-700">
              {result.message}
            </p>
            <Button className="mt-5" block onClick={() => setResult(null)}>
              Try again
            </Button>
          </Card>
        ) : (
          <>
            {!online ? (
              <p className="rounded-lg bg-warning-50 p-3 text-sm font-medium text-warning-700">
                You’re offline. Scanning is paused — handovers must be confirmed by the server.
              </p>
            ) : null}
            <QRScanner onToken={(t) => void onToken(t)} busy={working} />
          </>
        )}

        {/* Waiting for pickup */}
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-neutral-500">
            <Clock className="h-4 w-4 text-brand-600" aria-hidden />
            Waiting for pickup
          </h2>
          {waiting.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up"
              description="No orders are waiting for handover."
            />
          ) : (
            <ul className="space-y-2">
              {waiting.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="tap flex items-center justify-between rounded-xl border border-black/[0.05] bg-surface-card p-3 shadow-card hover:border-brand-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-900">
                        <span className="font-mono text-sm text-neutral-500">
                          {o.referenceNumber}
                        </span>{' '}
                        · {o.customerName}
                      </p>
                      <div className="mt-1">
                        <OrderStatusBadge status={o.orderStatus} size="sm" />
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-neutral-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
