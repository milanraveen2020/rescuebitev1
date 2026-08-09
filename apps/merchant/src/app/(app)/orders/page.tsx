'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import type { MerchantOrder, OrderStatus, StoreOrders } from '@rescuebite/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageBody,
  PageHeader,
  Section,
  TableSkeleton,
  useToast,
} from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { collectOrder, getStoreOrders, markNoShow } from '@/features/orders/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney, formatTimeRange, humanize } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; orders: StoreOrders }
  | { status: 'error'; message: string };

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  RESERVED: 'warning',
  PAID: 'info',
  COLLECTED: 'success',
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
  const [noShowTarget, setNoShowTarget] = useState<MerchantOrder | null>(null);

  const load = useCallback(() => {
    getStoreOrders(store.id)
      .then((orders) => setState({ status: 'ready', orders }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ApiRequestError ? e.message : 'Could not load orders.',
        }),
      );
  }, [store.id]);

  useEffect(load, [load]);

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
      setNoShowTarget(null);
      load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not mark no-show.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const todayCount = state.status === 'ready' ? state.orders.today.length : 0;

  return (
    <PageBody>
      <PageHeader
        title="Orders"
        description="Verify pickup codes and fulfil today's bags."
        actions={
          state.status === 'ready' ? (
            <Badge
              tone={todayCount > 0 ? 'info' : 'neutral'}
              dot
              className="h-[2.25rem] px-3 text-sm"
            >
              {todayCount} today
            </Badge>
          ) : null
        }
      />

      {/*
        The counter task comes first and stays oversized on purpose: it is used
        one-handed, at speed, often on a phone propped by a till.
      */}
      <Section
        className="border-brand-200 bg-brand-50/70"
        title="Verify a pickup"
        description="Type or scan the customer's code to hand the bag over."
      >
        <form onSubmit={(e) => void onVerify(e)} className="space-y-3">
          <label htmlFor="pickup-code" className="sr-only">
            Pickup code
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="pickup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="7F3K2"
              aria-invalid={verifyError ? true : undefined}
              aria-describedby={verifyError ? 'pickup-code-error' : undefined}
              className="nums h-14 flex-1 rounded-lg border border-line-strong bg-surface-card px-4 text-2xl font-bold uppercase tracking-[0.25em] text-neutral-900 outline-none transition placeholder:tracking-[0.25em] placeholder:text-subtle-foreground focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            <Button type="submit" size="lg" loading={verifying} className="h-14 sm:w-44">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              Collect
            </Button>
          </div>
          {verifyError ? (
            <p
              id="pickup-code-error"
              role="alert"
              className="text-sm font-semibold text-danger-600"
            >
              {verifyError}
            </p>
          ) : null}
        </form>
      </Section>

      {state.status === 'loading' ? (
        <Section title="Today" bodyClassName="p-0">
          <TableSkeleton rows={3} columns={3} />
        </Section>
      ) : null}

      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'ready' ? (
        <>
          <OrderGroup
            title="Today"
            orders={state.orders.today}
            emptyText="No pickups scheduled for today."
            busyId={busyId}
            onCollect={onCollect}
            onRequestNoShow={setNoShowTarget}
          />
          <OrderGroup
            title="Upcoming"
            orders={state.orders.upcoming}
            emptyText="No upcoming orders."
            busyId={busyId}
            onCollect={onCollect}
            onRequestNoShow={setNoShowTarget}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={noShowTarget !== null}
        title="Mark as no-show?"
        tone="danger"
        confirmLabel="Mark no-show"
        loading={busyId === noShowTarget?.id}
        description={
          noShowTarget ? (
            <>
              {noShowTarget.customer.name} did not collect{' '}
              <strong className="text-neutral-800">{noShowTarget.listing.title}</strong>. This
              closes the order and cannot be undone.
            </>
          ) : null
        }
        onCancel={() => setNoShowTarget(null)}
        onConfirm={() => {
          if (noShowTarget) void onNoShow(noShowTarget);
        }}
      />
    </PageBody>
  );
}

function OrderGroup({
  title,
  orders,
  emptyText,
  busyId,
  onCollect,
  onRequestNoShow,
}: {
  title: string;
  orders: MerchantOrder[];
  emptyText: string;
  busyId: string | null;
  onCollect: (o: MerchantOrder) => Promise<void>;
  onRequestNoShow: (o: MerchantOrder) => void;
}) {
  return (
    <Section
      title={title}
      description={
        orders.length > 0 ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : undefined
      }
      bodyClassName="p-0"
    >
      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" aria-hidden />}
          title={emptyText}
          className="py-[2.5rem]"
        />
      ) : (
        <ul className="divide-y divide-line">
          {orders.map((order) => {
            const windowPassed = new Date(order.listing.pickupEnd) < new Date();
            const busy = busyId === order.id;
            return (
              <li
                key={order.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-surface-raised/50 lg:flex-row lg:items-center lg:gap-6"
              >
                {/* The code is what staff match against, so it leads the row. */}
                <div className="flex shrink-0 items-center gap-3">
                  <span className="nums rounded-md border border-line bg-surface-raised px-3 py-2 font-mono text-base font-bold tracking-[0.15em] text-neutral-800">
                    {order.pickupCode}
                  </span>
                  <Badge tone={STATUS_TONE[order.status]} dot>
                    {humanize(order.status)}
                  </Badge>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-neutral-900">{order.listing.title}</p>
                  <p className="nums mt-0.5 text-sm text-muted-foreground">
                    {order.customer.name}
                    <span className="mx-1.5 text-line-strong">·</span>
                    {order.quantity}×<span className="mx-1.5 text-line-strong">·</span>
                    {formatMoney(order.totalAmount, order.currency)}
                    <span className="mx-1.5 text-line-strong">·</span>
                    {formatTimeRange(order.listing.pickupStart, order.listing.pickupEnd)}
                  </p>
                </div>

                {order.status === 'PAID' ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void onCollect(order)}>
                      Mark collected
                    </Button>
                    {windowPassed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onRequestNoShow(order)}
                      >
                        No-show
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
