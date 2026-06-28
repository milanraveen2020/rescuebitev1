'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Leaf, Receipt, ShoppingBag, Store as StoreIcon, UserPlus } from 'lucide-react';
import type { AdminOverview } from '@rescuebite/types';
import { Card } from '@rescuebite/ui/web';
import { getOverview } from '@/features/overview/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney, isoDay } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: AdminOverview }
  | { status: 'error'; message: string };

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: isoDay(from), to: isoDay(to) };
}

export default function OverviewPage() {
  const [range, setRange] = useState(defaultRange);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getOverview(range.from, range.to)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ApiRequestError ? e.message : 'Could not load the overview.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, [range]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Overview</h1>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            aria-label="From date"
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          />
          <span className="text-neutral-400">→</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            aria-label="To date"
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </div>
      </header>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-danger-600">{state.message}</p> : null}

      {state.status === 'ready' ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi
              icon={<Receipt className="h-5 w-5" />}
              label="GMV"
              value={formatMoney(state.data.gmvMinor, state.data.currency)}
            />
            <Kpi
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Orders"
              value={String(state.data.orders)}
            />
            <Kpi
              icon={<StoreIcon className="h-5 w-5" />}
              label="Active stores"
              value={String(state.data.activeStores)}
            />
            <Kpi
              icon={<UserPlus className="h-5 w-5" />}
              label="New users"
              value={String(state.data.newUsers)}
            />
            <Kpi
              icon={<Leaf className="h-5 w-5" />}
              label="Meals rescued"
              value={String(state.data.mealsRescued)}
              accent
            />
          </div>

          <Card>
            <h2 className="mb-4 font-display text-lg font-semibold text-neutral-900">Revenue</h2>
            <RevenueBars data={state.data.revenueSeries} currency={state.data.currency} />
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'bg-brand-50' : undefined}>
      <div className="flex items-center gap-2 text-brand-600">{icon}</div>
      <p className="mt-3 text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </Card>
  );
}

function RevenueBars({
  data,
  currency,
}: {
  data: AdminOverview['revenueSeries'];
  currency: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenueMinor));
  if (data.length === 0)
    return <p className="text-sm text-neutral-500">No revenue in this range.</p>;
  return (
    <div className="flex h-40 items-end gap-px" role="img" aria-label="Daily revenue">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex flex-1 items-end"
          title={`${d.date}: ${formatMoney(d.revenueMinor, currency)}`}
        >
          <div
            className="w-full rounded-t bg-brand-400"
            style={{ height: `${Math.max((d.revenueMinor / max) * 100, 1)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
