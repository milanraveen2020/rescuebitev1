'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  PackageCheck,
  QrCode,
  ShoppingBag,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { SessionTimer } from '@/components/SessionTimer';
import { SessionStatusBadge } from '@/components/StatusBadge';
import { StatsCard } from '@/components/StatsCard';
import { Card } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { formatCountdown, formatMoney } from '@/lib/format';
import { useSession } from '@/features/sessions/SessionContext';
import { useOrders } from '@/features/orders/OrdersContext';
import { ordersForSession, sessionStats } from '@/features/sessions/stats';

export default function ActiveSessionPage() {
  const { session } = useSession();
  const { orders } = useOrders();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sessionOrders = useMemo(() => ordersForSession(orders, session), [orders, session]);
  const stats = useMemo(() => sessionStats(session, sessionOrders), [session, sessionOrders]);

  if (!session) {
    return (
      <>
        <AppHeader title="Counter" subtitle="Nothing on sale right now" />
        <div className="p-4">
          <EmptyState
            icon={ShoppingBag}
            title="No active listing"
            description="Listings are published from the merchant dashboard. Once one is active, it appears here automatically."
          />
        </div>
      </>
    );
  }

  const remainingMs = Math.max(0, new Date(session.pickupEnd).getTime() - now);
  const soldOut = stats.remaining <= 0;
  const timeEnded = remainingMs <= 0;
  const orderedPct = stats.starting > 0 ? Math.round((stats.ordered / stats.starting) * 100) : 0;

  return (
    <>
      <AppHeader
        title={session.title}
        subtitle="On sale now"
        right={
          <SessionStatusBadge
            status={timeEnded ? 'time_ended' : soldOut ? 'sold_out' : 'active'}
            size="sm"
          />
        }
      />

      <div className="space-y-4 p-4 pb-8">
        <Card className="p-6">
          <SessionTimer
            startTime={session.pickupStart}
            scheduledEndTime={session.pickupEnd}
            now={() => Date.now()}
            frozen={timeEnded}
          />
        </Card>

        {timeEnded ? (
          <Alert tone="danger" icon={Clock} title="Pickup window has closed">
            {stats.ready > 0
              ? `${stats.ready} order(s) still await handover.`
              : 'All handovers are done.'}
          </Alert>
        ) : soldOut ? (
          <Alert tone="warning" icon={PackageCheck} title="All packages are ordered">
            Every bag is reserved. Keep handing over orders — {formatCountdown(remainingMs)} left.
          </Alert>
        ) : null}

        <Card className="p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-4xl font-extrabold leading-none text-brand-800">
                {stats.remaining}
              </p>
              <p className="mt-1.5 text-sm font-medium text-neutral-600">
                {stats.remaining === 1 ? 'package remaining' : 'packages remaining'}
              </p>
            </div>
            <p className="text-sm text-neutral-500">
              {stats.ordered} of {stats.starting} ordered
            </p>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-pill bg-surface-sunken">
            <div
              className="h-full rounded-pill bg-brand-600 transition-[width] duration-500"
              style={{ width: `${orderedPct}%` }}
              aria-hidden
            />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            icon={CheckCircle2}
            label="Handed over"
            value={stats.completed}
            tone="success"
          />
          <StatsCard
            icon={Coins}
            label="Revenue"
            value={formatMoney(stats.revenue, session.currency)}
            tone="accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/scanner"
            className="tap flex items-center justify-center gap-2 rounded-xl bg-brand-gradient py-4 font-semibold text-white shadow-card active:scale-[0.98]"
          >
            <QrCode className="h-5 w-5" aria-hidden />
            Scan code
          </Link>
          <Link
            href="/orders"
            className="tap flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-surface-card py-4 font-semibold text-neutral-800 shadow-card active:scale-[0.98]"
          >
            <ClipboardList className="h-5 w-5 text-brand-700" aria-hidden />
            All orders
          </Link>
        </div>

        <p className="pt-1 text-center text-xs text-neutral-500">
          Listings are managed in the merchant dashboard.
        </p>
      </div>
    </>
  );
}

function Alert({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'warning' | 'danger';
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === 'danger'
      ? 'bg-danger-50 text-danger-700 ring-danger-500/20'
      : 'bg-warning-50 text-warning-700 ring-warning-500/20';
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset ${styles}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{children}</p>
      </div>
    </div>
  );
}
