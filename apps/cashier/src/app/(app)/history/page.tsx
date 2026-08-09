'use client';

import { useMemo } from 'react';
import { History as HistoryIcon, Loader2 } from 'lucide-react';
import type { Listing } from '@rescuebite/types';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui';
import { SessionStatusBadge } from '@/components/StatusBadge';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { useSession } from '@/features/sessions/SessionContext';
import { useOrders } from '@/features/orders/OrdersContext';
import { ordersForSession, sessionStats } from '@/features/sessions/stats';

export default function HistoryPage() {
  const { past, phase, error } = useSession();
  const { orders } = useOrders();

  if (phase === 'loading') {
    return (
      <>
        <AppHeader title="History" subtitle="Past sessions" />
        <div className="flex justify-center p-10">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" aria-label="Loading" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title="History"
        subtitle={past.length === 1 ? '1 past session' : `${past.length} past sessions`}
      />

      <div className="space-y-3 p-4">
        {past.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No past sessions"
            description={error ?? 'Finished sessions and their results appear here.'}
          />
        ) : (
          past.map((s) => <PastSessionCard key={s.id} session={s} allOrders={orders} />)
        )}
      </div>
    </>
  );
}

function PastSessionCard({
  session,
  allOrders,
}: {
  session: Listing;
  allOrders: ReturnType<typeof useOrders>['orders'];
}) {
  const stats = useMemo(
    () => sessionStats(session, ordersForSession(allOrders, session)),
    [session, allOrders],
  );

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold text-neutral-900">
            {session.title}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {formatDate(session.pickupStart)} · {formatTime(session.pickupStart)}–
            {formatTime(session.pickupEnd)}
          </p>
        </div>
        <SessionStatusBadge
          status={session.status === 'SOLD_OUT' ? 'sold_out' : 'stopped'}
          size="sm"
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3 text-center">
        <Metric label="Ordered" value={`${stats.ordered}/${stats.starting}`} />
        <Metric label="Handed over" value={String(stats.completed)} />
        <Metric label="Revenue" value={formatMoney(stats.revenue, session.currency)} />
      </dl>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-display text-base font-extrabold text-neutral-900">{value}</dd>
      <dt className="mt-0.5 text-[11px] font-medium text-neutral-500">{label}</dt>
    </div>
  );
}
