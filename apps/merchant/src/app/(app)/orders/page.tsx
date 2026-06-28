'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import type { MerchantOrder, OrderStatus, StoreOrders } from '@rescuebite/types';
import { Badge, Card, useToast } from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { collectOrder, getStoreOrders, markNoShow } from '@/features/orders/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney, formatTimeRange, humanize } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; orders: StoreOrders }
  | { status: 'error'; message: string };

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'brand' | 'accent' | 'danger'> = {
  RESERVED: 'accent',
  PAID: 'brand',
  COLLECTED: 'neutral',
  CANCELLED: 'neutral',
  REFUNDED: 'neutral',
  NO_SHOW: 'danger',
};

export default function OrdersPage() {
  const { store } = useSession();
  const { toast } = useToast();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load(): void {
    getStoreOrders(store.id)
      .then((orders) => setState({ status: 'ready', orders }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ApiRequestError ? e.message : 'Could not load orders.',
        }),
      );
  }

  useEffect(load, [store.id]);

  async function onVerify(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (state.status !== 'ready') return;
    const trimmed = code.trim().toUpperCase();
    setVerifyError(null);
    if (trimmed.length < 4) {
      setVerifyError('Enter the full pickup code.');
      return;
    }
    const match = [...state.orders.today, ...state.orders.upcoming].find(
      (o) => o.pickupCode.toUpperCase() === trimmed,
    );
    if (!match) {
      setVerifyError('No order matches that code.');
      return;
    }
    if (match.status !== 'PAID') {
      setVerifyError(`That order is ${humanize(match.status).toLowerCase()}, not awaiting pickup.`);
      return;
    }
    setVerifying(true);
    try {
      await collectOrder(match.id, match.pickupCode);
      toast('Pickup confirmed — order collected.', 'success');
      setCode('');
      load();
    } catch (e) {
      setVerifyError(e instanceof ApiRequestError ? e.message : 'Could not verify that code.');
    } finally {
      setVerifying(false);
    }
  }

  async function onCollect(order: MerchantOrder): Promise<void> {
    setBusyId(order.id);
    try {
      await collectOrder(order.id, order.pickupCode);
      toast('Order collected.', 'success');
      load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not mark collected.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function onNoShow(order: MerchantOrder): Promise<void> {
    setBusyId(order.id);
    try {
      await markNoShow(order.id);
      toast('Marked as no-show.', 'neutral');
      load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not mark no-show.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Verify pickups and fulfill today&apos;s bags.
        </p>
      </header>

      {/* Big one-handed pickup verification */}
      <Card className="bg-brand-50">
        <form onSubmit={(e) => void onVerify(e)} className="space-y-3">
          <label
            htmlFor="pickup-code"
            className="block font-display text-lg font-semibold text-neutral-900"
          >
            Verify pickup code
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                id="pickup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="e.g. 7F3K2"
                className="h-14 w-full rounded-lg border border-neutral-300 bg-white pl-11 pr-3 text-2xl font-bold uppercase tracking-widest text-neutral-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="flex h-14 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
            >
              <CheckCircle2 className="h-6 w-6" aria-hidden />
              {verifying ? 'Verifying…' : 'Collect'}
            </button>
          </div>
          {verifyError ? (
            <p role="alert" className="text-sm font-medium text-danger-600">
              {verifyError}
            </p>
          ) : null}
        </form>
      </Card>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading orders…</p> : null}
      {state.status === 'error' ? (
        <div className="space-y-3">
          <p className="text-danger-600">{state.message}</p>
          <button onClick={load} className="rounded-md border px-4 py-2 text-sm font-medium">
            Retry
          </button>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <OrderGroup
            title="Today"
            orders={state.orders.today}
            emptyText="No pickups scheduled for today."
            busyId={busyId}
            onCollect={onCollect}
            onNoShow={onNoShow}
          />
          <OrderGroup
            title="Upcoming"
            orders={state.orders.upcoming}
            emptyText="No upcoming orders."
            busyId={busyId}
            onCollect={onCollect}
            onNoShow={onNoShow}
          />
        </>
      ) : null}
    </div>
  );
}

function OrderGroup({
  title,
  orders,
  emptyText,
  busyId,
  onCollect,
  onNoShow,
}: {
  title: string;
  orders: MerchantOrder[];
  emptyText: string;
  busyId: string | null;
  onCollect: (o: MerchantOrder) => Promise<void>;
  onNoShow: (o: MerchantOrder) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-neutral-900">
        {title} <span className="text-neutral-400">({orders.length})</span>
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const windowPassed = new Date(order.listing.pickupEnd) < new Date();
            const busy = busyId === order.id;
            return (
              <li key={order.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-neutral-900">{order.listing.title}</p>
                      <Badge tone={STATUS_TONE[order.status]}>{humanize(order.status)}</Badge>
                    </div>
                    <p className="text-sm text-neutral-500">
                      {order.customer.name} · {order.quantity}× ·{' '}
                      {formatMoney(order.totalAmount, order.currency)}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {formatTimeRange(order.listing.pickupStart, order.listing.pickupEnd)} · Code{' '}
                      <span className="font-mono font-semibold tracking-wider text-neutral-700">
                        {order.pickupCode}
                      </span>
                    </p>
                  </div>
                  {order.status === 'PAID' ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => void onCollect(order)}
                        disabled={busy}
                        className="min-h-11 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        Mark collected
                      </button>
                      {windowPassed ? (
                        <button
                          onClick={() => void onNoShow(order)}
                          disabled={busy}
                          className="min-h-11 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
                        >
                          No-show
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
