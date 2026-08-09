import type { Listing } from '@rescuebite/types';
import type { Order } from '@/lib/types';

export interface SessionStats {
  starting: number;
  /** Bags ordered — server truth: total minus what's still available. */
  ordered: number;
  remaining: number;
  /** Orders awaiting handover. */
  ready: number;
  /** Orders handed over. */
  completed: number;
  revenue: number;
  originalValue: number;
  savings: number;
  completionRate: number;
}

/** Derive counter figures from the session listing plus its real orders. */
export function sessionStats(session: Listing | null, orders: Order[]): SessionStats {
  const empty: SessionStats = {
    starting: 0,
    ordered: 0,
    remaining: 0,
    ready: 0,
    completed: 0,
    revenue: 0,
    originalValue: 0,
    savings: 0,
    completionRate: 0,
  };
  if (!session) return empty;

  let ready = 0;
  let completed = 0;
  let revenue = 0;
  let bags = 0;
  for (const o of orders) {
    if (o.orderStatus === 'completed') completed += 1;
    else ready += 1;
    revenue += o.totalPaid;
    bags += o.quantity;
  }
  const originalValue = bags * session.originalPrice;
  const total = ready + completed;
  return {
    starting: session.quantityTotal,
    ordered: session.quantityTotal - session.quantityRemaining,
    remaining: session.quantityRemaining,
    ready,
    completed,
    revenue,
    originalValue,
    savings: originalValue - revenue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/** Orders belonging to a given session (listing). */
export function ordersForSession(orders: Order[], session: Listing | null): Order[] {
  if (!session) return [];
  return orders.filter((o) => o.packageId === session.id);
}
