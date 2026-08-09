'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MerchantOrder } from '@rescuebite/types';
import { ApiRequestError } from '@/lib/api-session';
import { useAuth } from '@/lib/auth';
import type { Order } from '@/lib/types';
import { collectOrder, getStoreOrders, isCounterOrder, toCashierOrder } from './api';

/** How often to re-poll for new orders (the API has no push channel yet). */
const POLL_MS = 15000;

type Phase = 'loading' | 'ready' | 'error';

interface OrdersValue {
  orders: Order[];
  phase: Phase;
  error: string | null;
  refreshing: boolean;
  /** Ids of orders first seen in the last poll — drives the "New" highlight. */
  recentOrderIds: string[];
  refresh: () => Promise<void>;
  /** Server validates the pickup code and collects atomically. */
  collect: (orderId: string, pickupCode: string) => Promise<{ ok: boolean; message: string }>;
  findOrder: (id: string) => Order | undefined;
}

const OrdersCtx = createContext<OrdersValue | null>(null);

export function useOrders(): OrdersValue {
  const ctx = useContext(OrdersCtx);
  if (!ctx) throw new Error('useOrders must be used within <OrdersProvider>.');
  return ctx;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { store } = useAuth();
  const storeId = store?.id ?? null;

  const [raw, setRaw] = useState<MerchantOrder[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);
  const seenIds = useRef<Set<string> | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!storeId) return;
      if (isRefresh) setRefreshing(true);
      try {
        const list = (await getStoreOrders(storeId)).filter(isCounterOrder);
        setRaw(list);
        setError(null);
        setPhase('ready');

        // First load seeds the "seen" set so we don't flag everything as new.
        const ids = new Set(list.map((o) => o.id));
        if (seenIds.current === null) {
          seenIds.current = ids;
        } else {
          const fresh = list.filter((o) => !seenIds.current?.has(o.id)).map((o) => o.id);
          seenIds.current = ids;
          if (fresh.length > 0) {
            setRecentOrderIds((prev) => [...fresh, ...prev]);
            setTimeout(() => {
              setRecentOrderIds((prev) => prev.filter((id) => !fresh.includes(id)));
            }, 6000);
          }
        }
      } catch (e) {
        const message =
          e instanceof ApiRequestError ? e.message : 'Could not load orders. Please try again.';
        setError(message);
        // Keep showing whatever we already have; only hard-fail the first load.
        setPhase((p) => (p === 'loading' ? 'error' : p));
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [storeId],
  );

  useEffect(() => {
    if (!storeId) return;
    void load(false);
    const id = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(id);
  }, [storeId, load]);

  const collect = useCallback(
    async (orderId: string, pickupCode: string): Promise<{ ok: boolean; message: string }> => {
      try {
        await collectOrder(orderId, pickupCode);
        await load(true);
        return { ok: true, message: 'Handover complete.' };
      } catch (e) {
        return {
          ok: false,
          message:
            e instanceof ApiRequestError ? e.message : 'Could not complete. Please try again.',
        };
      }
    },
    [load],
  );

  const orders = useMemo(() => raw.map(toCashierOrder), [raw]);

  const value: OrdersValue = {
    orders,
    phase,
    error,
    refreshing,
    recentOrderIds,
    refresh: () => load(true),
    collect,
    findOrder: (id) => orders.find((o) => o.id === id),
  };

  return <OrdersCtx.Provider value={value}>{children}</OrdersCtx.Provider>;
}
