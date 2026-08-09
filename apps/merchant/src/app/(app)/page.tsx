'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Package, Receipt, TrendingUp } from 'lucide-react';
import type { MerchantDashboard } from '@rescuebite/types';
import {
  Badge,
  ErrorState,
  PageBody,
  PageHeader,
  Section,
  StatCard,
  StatGrid,
  StatGridSkeleton,
  BlockSkeleton,
} from '@rescuebite/ui/web';
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

  const load = useCallback(() => {
    let active = true;
    setState({ status: 'loading' });
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

  useEffect(load, [load]);

  const pending = state.status === 'ready' ? state.data.ordersToFulfill : 0;

  return (
    <PageBody>
      <PageHeader
        title="Today"
        description={`How ${store.name} is doing right now.`}
        actions={
          // The store's live state belongs beside the title, not buried below the
          // chart where the old duplicate action buttons used to sit.
          pending > 0 ? (
            <Link href="/orders" className="focus-visible:outline-none">
              <Badge tone="warning" dot className="h-[2.25rem] px-3 text-sm">
                {pending} order{pending === 1 ? '' : 's'} to fulfil
              </Badge>
            </Link>
          ) : (
            <Badge tone="success" dot className="h-[2.25rem] px-3 text-sm">
              All caught up
            </Badge>
          )
        }
      />

      {state.status === 'loading' ? (
        <>
          <StatGridSkeleton count={4} />
          <BlockSkeleton lines={5} />
        </>
      ) : null}

      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'ready' ? (
        <>
          <StatGrid>
            <StatCard
              label="Orders to fulfil"
              value={String(state.data.ordersToFulfill)}
              icon={<ClipboardList className="h-4 w-4" />}
              hint={pending > 0 ? 'Waiting at the counter' : 'Nothing waiting'}
              emphasis={pending > 0}
            />
            <StatCard
              label="Revenue today"
              value={formatMoney(state.data.revenueTodayMinor, state.data.currency)}
              icon={<Receipt className="h-4 w-4" />}
            />
            <StatCard
              label="Active listings"
              value={String(state.data.activeListings)}
              icon={<Package className="h-4 w-4" />}
              hint={state.data.activeListings === 0 ? 'Nothing on sale' : undefined}
            />
            <StatCard
              label="Sell-through"
              value={`${state.data.sellThroughPercent}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              hint="Of today's stock"
            />
          </StatGrid>

          <Section
            title="Last 7 days"
            description="Daily revenue across your surprise bags."
            actions={
              isOwner ? (
                <Link
                  href="/analytics"
                  className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-md px-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  Analytics
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null
            }
          >
            <RevenueChart data={state.data.revenueSeries} currency={state.data.currency} />
          </Section>
        </>
      ) : null}
    </PageBody>
  );
}
