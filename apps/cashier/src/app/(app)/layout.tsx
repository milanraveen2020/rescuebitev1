'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ChangePassword } from '@/features/shell/ChangePassword';
import { SessionProvider } from '@/features/sessions/SessionContext';
import { OrdersProvider, useOrders } from '@/features/orders/OrdersContext';
import { useToast } from '@/components/Toast';
import { OfflineBanner } from '@/components/OfflineBanner';
import { BottomNavigation } from '@/components/BottomNavigation';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { ready, staff, setStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !staff) router.replace('/login');
  }, [ready, staff, router]);

  if (!ready || !staff) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-page">
        <Loader2 className="h-7 w-7 animate-spin text-brand-600" aria-label="Loading" />
      </main>
    );
  }

  // An invited account must retire its temporary password before running a counter.
  if (staff.mustChangePassword) {
    return <ChangePassword onDone={setStaff} />;
  }

  return (
    <SessionProvider>
      <OrdersProvider>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-surface-page shadow-[0_0_60px_rgba(40,66,55,0.06)]">
          <OfflineBanner />
          <NewOrderWatcher />
          <div className="flex-1 pb-20">{children}</div>
          <BottomNavigation />
        </div>
      </OrdersProvider>
    </SessionProvider>
  );
}

/** Announces orders that appeared since the last poll. */
function NewOrderWatcher() {
  const { orders, recentOrderIds } = useOrders();
  const { show } = useToast();
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const id of recentOrderIds) {
      if (announced.current.has(id)) continue;
      announced.current.add(id);
      const order = orders.find((o) => o.id === id);
      if (!order) continue;
      show({
        kind: 'order',
        title: 'New order received',
        description: `${order.customerName} · ×${order.quantity}`,
      });
      try {
        navigator.vibrate?.(120);
      } catch {
        // Vibration unsupported — the toast is enough.
      }
    }
  }, [recentOrderIds, orders, show]);

  return null;
}
