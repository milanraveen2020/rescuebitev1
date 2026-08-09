'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw, SearchX } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { OrderCard } from '@/components/OrderCard';
import { OrderListSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SearchAndFilter, type SortOrder, type StatusFilter } from '@/components/SearchAndFilter';
import { Button } from '@/components/ui';
import { useOrders } from '@/features/orders/OrdersContext';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const { orders, recentOrderIds, phase, error, refreshing, refresh } = useOrders();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const pull = usePullToRefresh(() => void refresh());

  const counts = useMemo(() => {
    const c: Partial<Record<StatusFilter, number>> = { all: orders.length };
    for (const o of orders) c[o.orderStatus] = (c[o.orderStatus] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (status !== 'all' && o.orderStatus !== status) return false;
      if (!q) return true;
      return (
        o.referenceNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const diff = new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
      return sort === 'newest' ? -diff : diff;
    });
    return list;
  }, [orders, query, status, sort]);

  return (
    <>
      <AppHeader
        title="Orders"
        subtitle={`${orders.length} this session`}
        right={
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Refresh orders"
            className="tap flex h-11 w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-surface-raised"
          >
            <RefreshCw className={refreshing ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} aria-hidden />
          </button>
        }
      />

      <div className="sticky top-14 z-20 bg-surface-page/95 px-4 pb-2 pt-3 backdrop-blur">
        <SearchAndFilter
          query={query}
          onQuery={setQuery}
          status={status}
          onStatus={setStatus}
          sort={sort}
          onSort={setSort}
          counts={counts}
        />
      </div>

      <div
        className="relative min-h-[40vh] p-4"
        onTouchStart={pull.onTouchStart}
        onTouchMove={pull.onTouchMove}
        onTouchEnd={pull.onTouchEnd}
      >
        {pull.pulling > 0 || refreshing ? (
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-neutral-500">
            <Loader2
              className={refreshing || pull.pulling > 60 ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              aria-hidden
            />
            {refreshing ? 'Refreshing…' : 'Pull to refresh'}
          </div>
        ) : null}

        {phase === 'loading' ? (
          <OrderListSkeleton />
        ) : phase === 'error' ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn’t load orders"
            description={error ?? 'Something went wrong fetching your store’s orders.'}
            action={<Button onClick={() => void refresh()}>Retry</Button>}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No orders yet"
            description="When customers reserve bags, their orders show up here in real time."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No matching orders"
            description="Try a different search term or status filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((order: Order) => (
              <li key={order.id}>
                <OrderCard
                  order={order}
                  packageName={order.packageName}
                  now={now}
                  highlight={recentOrderIds.includes(order.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Lightweight pull-to-refresh: only engages when the page is scrolled to top. */
function usePullToRefresh(onRefresh: () => void) {
  const startY = useRef<number | null>(null);
  const [pulling, setPulling] = useState(0);

  return {
    pulling,
    onTouchStart: (e: React.TouchEvent) => {
      if (window.scrollY <= 0) startY.current = e.touches[0]?.clientY ?? null;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startY.current === null) return;
      const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (delta > 0) setPulling(Math.min(90, delta));
    },
    onTouchEnd: () => {
      if (pulling > 60) onRefresh();
      startY.current = null;
      setPulling(0);
    },
  };
}
