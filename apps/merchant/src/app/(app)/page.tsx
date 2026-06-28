'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Package, ClipboardList, TrendingUp, Receipt } from 'lucide-react';
import type { MerchantDashboard } from '@rescuebite/types';
import { Card } from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { RevenueChart } from '@/features/dashboard/RevenueChart';
import { getDashboard } from '@/features/dashboard/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: MerchantDashboard }
  | { status: 'error'; message: string };

export default function DashboardPage() {
  const { store, isOwner } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ApiRequestError ? e.message : 'Could not load the dashboard.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Today</h1>
        <p className="text-sm text-muted-foreground">{store.name}</p>
      </header>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-danger-600">{state.message}</p> : null}

      {state.status === 'ready' ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              icon={<Package className="h-5 w-5" />}
              label="Active listings"
              value={String(state.data.activeListings)}
            />
            <Stat
              icon={<ClipboardList className="h-5 w-5" />}
              label="Orders to fulfill"
              value={String(state.data.ordersToFulfill)}
              href="/orders"
            />
            <Stat
              icon={<Receipt className="h-5 w-5" />}
              label="Revenue today"
              value={formatMoney(state.data.revenueTodayMinor, state.data.currency)}
            />
            <Stat
              icon={<TrendingUp className="h-5 w-5" />}
              label="Sell-through"
              value={`${state.data.sellThroughPercent}%`}
            />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Last 7 days</h2>
              {isOwner ? (
                <Link href="/analytics" className="text-sm font-medium text-brand-600">
                  Analytics →
                </Link>
              ) : null}
            </div>
            <RevenueChart data={state.data.revenueSeries} currency={state.data.currency} />
          </Card>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/orders"
              className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Verify a pickup
            </Link>
            {isOwner ? (
              <Link
                href="/listings/new"
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                New listing
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <Card className="h-full">
      <div className="flex items-center gap-2 text-brand-600">{icon}</div>
      <p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}
