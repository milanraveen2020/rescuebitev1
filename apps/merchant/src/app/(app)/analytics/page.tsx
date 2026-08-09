'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Leaf, Package2, TrendingUp } from 'lucide-react';
import type { MerchantAnalytics } from '@rescuebite/types';
import {
  EmptyState,
  ErrorState,
  PageBody,
  PageHeader,
  Section,
  SegmentedControl,
  StatCard,
  StatGrid,
  StatGridSkeleton,
  BlockSkeleton,
} from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { RevenueChart } from '@/features/dashboard/RevenueChart';
import { getAnalytics } from '@/features/analytics/api';
import { ApiRequestError } from '@/lib/request';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
] as const;

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: MerchantAnalytics }
  | { status: 'error'; message: string };

export default function AnalyticsPage() {
  const { store } = useSession();
  const [days, setDays] = useState('14');
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(() => {
    let active = true;
    setState({ status: 'loading' });
    getAnalytics(Number(days))
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

  useEffect(load, [load]);

  return (
    <PageBody>
      <PageHeader
        title="Analytics"
        description="How your store is performing over time."
        actions={
          <SegmentedControl label="Date range" value={days} options={RANGES} onChange={setDays} />
        }
      />

      {state.status === 'loading' ? (
        <>
          <StatGridSkeleton count={3} />
          <BlockSkeleton lines={5} />
        </>
      ) : null}

      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'ready' ? (
        <>
          <StatGrid>
            <StatCard
              label="Sell-through"
              value={`${state.data.sellThroughPercent}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              hint={`Across the last ${days} days`}
            />
            <StatCard
              label="Bags rescued"
              value={String(state.data.bagsRescued)}
              icon={<Package2 className="h-4 w-4" />}
            />
            <StatCard
              label="CO₂ saved"
              value={`${state.data.co2KgSaved} kg`}
              icon={<Leaf className="h-4 w-4" />}
              hint="Estimated from bags rescued"
              emphasis
            />
          </StatGrid>

          {/* Chart and ranking side by side: on a desktop these are compared, not read in sequence. */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
            <Section title={`Revenue · last ${days} days`}>
              <RevenueChart data={state.data.revenueSeries} currency={store.currency} />
            </Section>

            <Section
              title="Top listings"
              description="Best sellers in this period."
              bodyClassName="p-0"
            >
              {state.data.topListings.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-7 w-7" aria-hidden />}
                  title="No sales in this period"
                  description="Publish a listing to start collecting data."
                  className="py-[2.5rem]"
                />
              ) : (
                <ol className="divide-y divide-line">
                  {state.data.topListings.map((l, i) => (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                      <span
                        aria-hidden
                        className="nums flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-raised text-xs font-bold text-muted-foreground"
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                        {l.title}
                      </span>
                      <span className="nums shrink-0 text-sm text-muted-foreground">
                        <strong className="font-semibold text-neutral-800">{l.quantitySold}</strong>{' '}
                        sold · {l.ordersCount} orders
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        </>
      ) : null}
    </PageBody>
  );
}
