'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Inbox, LogOut, RotateCcw, Share2 } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { SessionStatusBadge } from '@/components/StatusBadge';
import { Button, Card } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { CompletionRing, MoneyRow, SoldBar, StatusBreakdown } from '@/components/SessionSummary';
import { formatDate, formatDuration, formatMoney, formatTime } from '@/lib/format';
import { useSession } from '@/features/sessions/SessionContext';
import { useOrders } from '@/features/orders/OrdersContext';
import { ordersForSession, sessionStats } from '@/features/sessions/stats';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';

export default function SummaryPage() {
  const router = useRouter();
  const { past } = useSession();
  const { orders } = useOrders();
  const { signOut } = useAuth();
  const { show } = useToast();

  // The most recently finished session.
  const finished = past[0] ?? null;
  const sessionOrders = useMemo(() => ordersForSession(orders, finished), [orders, finished]);
  const stats = useMemo(() => sessionStats(finished, sessionOrders), [finished, sessionOrders]);

  if (!finished) {
    return (
      <>
        <AppHeader title="Summary" />
        <div className="p-4">
          <EmptyState
            icon={Inbox}
            title="No finished sessions yet"
            description="Once a session ends, its summary appears here."
            action={
              <Link
                href="/session/active"
                className="tap inline-flex h-12 items-center rounded-lg bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800"
              >
                Go to counter
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const minutes = Math.round(
    (new Date(finished.pickupEnd).getTime() - new Date(finished.pickupStart).getTime()) / 60000,
  );

  async function shareSummary() {
    if (!finished) return;
    const text = [
      `Mystery Box — ${finished.title} summary`,
      `${formatDate(finished.pickupStart)} · ${formatTime(finished.pickupStart)}–${formatTime(finished.pickupEnd)}`,
      `Ordered ${stats.ordered}/${stats.starting} · Revenue ${formatMoney(stats.revenue, finished.currency)}`,
      `Handed over ${stats.completed} · Awaiting ${stats.ready} · Completion ${stats.completionRate}%`,
    ].join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Session summary', text });
      } else {
        await navigator.clipboard.writeText(text);
        show({ kind: 'success', title: 'Summary copied', description: 'Paste it anywhere.' });
      }
    } catch {
      show({ kind: 'info', title: 'Sharing cancelled' });
    }
  }

  return (
    <>
      <AppHeader
        title="Session summary"
        subtitle={finished.title}
        right={
          <SessionStatusBadge
            status={finished.status === 'SOLD_OUT' ? 'sold_out' : 'stopped'}
            size="sm"
          />
        }
      />

      <div className="space-y-4 p-4 pb-8">
        <Card className="flex items-center gap-5 p-5">
          <CompletionRing percent={stats.completionRate} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold text-neutral-900">Nicely done!</p>
            <p className="mt-0.5 text-sm text-neutral-500">
              Customers ordered {stats.ordered} bag{stats.ordered === 1 ? '' : 's'} and saved{' '}
              {formatMoney(stats.savings, finished.currency)}.
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
            Bags ordered
          </h2>
          <SoldBar sold={stats.ordered} remaining={stats.remaining} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
            Timing
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Date" value={formatDate(finished.pickupStart)} />
            <Field label="Duration" value={formatDuration(minutes)} />
            <Field label="Started" value={formatTime(finished.pickupStart)} />
            <Field label="Ended" value={formatTime(finished.pickupEnd)} />
          </dl>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
            Orders
          </h2>
          <StatusBreakdown stats={stats} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-neutral-500">Money</h2>
          <dl className="divide-y divide-neutral-100">
            <MoneyRow
              label="Original value"
              value={formatMoney(stats.originalValue, finished.currency)}
            />
            <MoneyRow
              label="Customer savings"
              value={formatMoney(stats.savings, finished.currency)}
            />
            <MoneyRow
              label="Actual revenue"
              value={formatMoney(stats.revenue, finished.currency)}
              strong
            />
          </dl>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/orders"
            className="tap rounded-xl border border-neutral-300 bg-surface-card py-3 text-center text-sm font-semibold text-neutral-800 shadow-card hover:bg-surface-raised"
          >
            View orders
          </Link>
          <button
            type="button"
            onClick={() => void shareSummary()}
            className="tap flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-surface-card py-3 text-sm font-semibold text-neutral-800 shadow-card hover:bg-surface-raised"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </button>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            block
            size="lg"
            onClick={() => router.push('/session/active')}
            leftIcon={<RotateCcw className="h-5 w-5" aria-hidden />}
          >
            Back to counter
          </Button>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => router.replace('/login'));
            }}
            className="tap flex h-12 w-full items-center justify-center gap-2 rounded-lg font-semibold text-neutral-500 hover:text-danger-600"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            Log out
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="font-display font-bold text-neutral-900">{value}</dd>
    </div>
  );
}
