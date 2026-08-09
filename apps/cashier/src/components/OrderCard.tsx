'use client';

import Link from 'next/link';
import { ChevronRight, Phone, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMoney, timeAgo } from '@/lib/format';
import type { Order } from '@/lib/types';
import { OrderStatusBadge } from './StatusBadge';

export function OrderCard({
  order,
  packageName,
  now,
  highlight,
}: {
  order: Order;
  packageName: string;
  now: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className={cn(
        'tap block rounded-xl border bg-surface-card p-4 shadow-card transition',
        'hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        highlight
          ? 'border-brand-400 ring-2 ring-brand-400/40 animate-slide-up'
          : 'border-black/[0.05]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-neutral-800">
            {order.referenceNumber}
          </span>
          {highlight ? (
            <span className="rounded-pill bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              New
            </span>
          ) : null}
        </div>
        <OrderStatusBadge status={order.orderStatus} size="sm" />
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">{order.customerName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
            <Phone className="h-3 w-3" aria-hidden />
            {order.customerPhone}
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-neutral-300" aria-hidden />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
          <span className="truncate">{packageName}</span>
          <span className="text-neutral-400">×{order.quantity}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{timeAgo(order.purchasedAt, now)}</span>
          <span className="font-display text-sm font-bold text-brand-800">
            {formatMoney(order.totalPaid, 'LKR')}
          </span>
        </div>
      </div>
    </Link>
  );
}
