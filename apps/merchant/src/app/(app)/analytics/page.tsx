'use client';

import { useEffect, useState } from 'react';
import { Leaf, Package2, TrendingUp } from 'lucide-react';
import type { MerchantAnalytics } from '@rescuebite/types';
import { Card } from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { RevenueChart } from '@/features/dashboard/RevenueChart';
import { getAnalytics } from '@/features/analytics/api';
import { ApiRequestError } from '@/lib/request';

const RANGES = [7, 14, 30] as const;

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: MerchantAnalytics }
  | { status: 'error'; message: string };

export default function AnalyticsPage() {
  const { store } = useSession();
  const [days, setDays] = useState<(typeof RANGES)[number]>(14);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getAnalytics(days)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ApiRequestError ? e.message : 'Could not load analytics.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, [days]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Your store&apos;s performance over time.</p>
        </div>
        <div
          className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5"
          role="group"
          aria-label="Date range"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`min-h-9 rounded px-3 text-sm font-medium ${
                days === r ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-danger-600">{state.message}</p> : null}

      {state.status === 'ready' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric
              icon={<TrendingUp className="h-5 w-5" />}
              label="Sell-through"
              value={`${state.data.sellThroughPercent}%`}
            />
            <Metric
              icon={<Package2 className="h-5 w-5" />}
              label="Bags rescued"
              value={String(state.data.bagsRescued)}
            />
            <Metric
              icon={<Leaf className="h-5 w-5" />}
              label="CO₂ saved"
              value={`${state.data.co2KgSaved} kg`}
              accent
            />
          </div>

          <Card>
            <h2 className="mb-4 font-display text-lg font-semibold text-neutral-900">
              Revenue (last {days} days)
            </h2>
            <RevenueChart data={state.data.revenueSeries} currency={store.currency} />
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-lg font-semibold text-neutral-900">
              Top listings
            </h2>
            {state.data.topListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this period yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {state.data.topListings.map((l, i) => (
                  <li key={l.id} className="flex items-center justify-between py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-sm font-semibold text-neutral-400">{i + 1}</span>
                      <span className="truncate text-neutral-800">{l.title}</span>
                    </span>
                    <span className="shrink-0 text-sm text-neutral-500">
                      {l.quantitySold} sold · {l.ordersCount} orders
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'bg-brand-50' : undefined}>
      <div className="flex items-center gap-2 text-brand-600">{icon}</div>
      <p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </Card>
  );
}
