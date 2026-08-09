'use client';

import { useCallback, useEffect, useState } from 'react';
import { Leaf, Receipt, ShoppingBag, Store as StoreIcon, UserPlus } from 'lucide-react';
import type { AdminOverview } from '@rescuebite/types';
import {
  BlockSkeleton,
  EmptyState,
  ErrorState,
  Input,
  PageBody,
  PageHeader,
  Section,
  SegmentedControl,
  StatCard,
  StatGrid,
  StatGridSkeleton,
} from '@rescuebite/ui/web';
import { getOverview } from '@/features/overview/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney, isoDay } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: AdminOverview }
  | { status: 'error'; message: string };

const PRESETS = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'custom', label: 'Custom' },
] as const;

function rangeForDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(to) };
}

export default function OverviewPage() {
  const [preset, setPreset] = useState<string>('30');
  const [range, setRange] = useState(() => rangeForDays(30));
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(() => {
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

  useEffect(load, [load]);

  function onPreset(next: string): void {
    setPreset(next);
    // "Custom" keeps whatever dates are showing so the inputs don't jump.
    if (next !== 'custom') setRange(rangeForDays(Number(next)));
  }

  return (
    <PageBody>
      <PageHeader
        title="Overview"
        description="Platform health across every store."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Date range preset"
              value={preset}
              options={PRESETS}
              onChange={onPreset}
            />
            {preset === 'custom' ? (
              <div className="flex items-end gap-2">
                <Input
                  label="From"
                  hideLabel
                  type="date"
                  className="h-[2.25rem] w-36"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
                <span aria-hidden className="pb-2 text-muted-foreground">
                  →
                </span>
                <Input
                  label="To"
                  hideLabel
                  type="date"
                  className="h-[2.25rem] w-36"
                  value={range.to}
                  min={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
              </div>
            ) : null}
          </div>
        }
      />

      {state.status === 'loading' ? (
        <>
          <StatGridSkeleton count={5} />
          <BlockSkeleton lines={6} />
        </>
      ) : null}

      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'ready' ? (
        <>
          <StatGrid>
            <StatCard
              label="GMV"
              value={formatMoney(state.data.gmvMinor, state.data.currency)}
              icon={<Receipt className="h-4 w-4" />}
              hint="Gross merchandise value"
            />
            <StatCard
              label="Orders"
              value={String(state.data.orders)}
              icon={<ShoppingBag className="h-4 w-4" />}
            />
            <StatCard
              label="Active stores"
              value={String(state.data.activeStores)}
              icon={<StoreIcon className="h-4 w-4" />}
            />
            <StatCard
              label="New users"
              value={String(state.data.newUsers)}
              icon={<UserPlus className="h-4 w-4" />}
              hint="In this period"
            />
            <StatCard
              label="Meals rescued"
              value={String(state.data.mealsRescued)}
              icon={<Leaf className="h-4 w-4" />}
              emphasis
            />
          </StatGrid>

          <Section title="Revenue" description={`${range.from} → ${range.to}`}>
            <RevenueBars data={state.data.revenueSeries} currency={state.data.currency} />
          </Section>
        </>
      ) : null}
    </PageBody>
  );
}

function RevenueBars({
  data,
  currency,
}: {
  data: AdminOverview['revenueSeries'];
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.revenueMinor), 0);

  if (data.length === 0) {
    return <EmptyState title="No revenue in this range" className="py-8" />;
  }
  // An all-zero series used to render a full-height strip of 1%-tall slivers.
  if (max === 0) {
    return (
      <EmptyState
        title="No revenue in this range"
        description="Try a wider date range, or check that stores have active listings."
        className="py-8"
      />
    );
  }

  const total = data.reduce((sum, d) => sum + d.revenueMinor, 0);

  return (
    <figure className="m-0">
      <div className="flex h-48 items-end gap-px" role="img" aria-label="Daily revenue">
        {data.map((d) => (
          <div
            key={d.date}
            className="group flex flex-1 items-end"
            title={`${d.date}: ${formatMoney(d.revenueMinor, currency)}`}
          >
            <div
              className="w-full rounded-t bg-brand-400 transition-colors duration-fast group-hover:bg-brand-600"
              style={{ height: `${Math.max((d.revenueMinor / max) * 100, 1)}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="nums mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted-foreground">
        <span>
          Total{' '}
          <strong className="font-semibold text-neutral-800">{formatMoney(total, currency)}</strong>
        </span>
        <span>
          Peak day{' '}
          <strong className="font-semibold text-neutral-800">{formatMoney(max, currency)}</strong>
        </span>
        <span>
          <strong className="font-semibold text-neutral-800">{data.length}</strong> days
        </span>
      </figcaption>
    </figure>
  );
}
