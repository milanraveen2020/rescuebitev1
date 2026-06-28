'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@rescuebite/types';
import { logout, refreshSession } from '@/lib/auth';
import { setAccessToken } from '@/lib/session';
import { initMonitoring } from '@/lib/monitoring';

// Initialize error monitoring once on the client (no-op unless a DSN is set).
initMonitoring();

interface SessionValue {
  user: User;
  signOut: () => Promise<void>;
}

const SessionCtx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionCtx);
  if (!value) throw new Error('useSession must be used within <SessionProvider>.');
  return value;
}

type State = { status: 'loading' } | { status: 'ready'; user: User };

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then(async (session) => {
        if (!active) return;
        // Defense in depth: never render the console for a non-admin session.
        if (session.user.role !== 'ADMIN') {
          await logout();
          router.replace('/login');
          return;
        }
        setAccessToken(session.accessToken);
        setState({ status: 'ready', user: session.user });
      })
      .catch(() => {
        if (active) router.replace('/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
        Loading the console…
      </main>
    );
  }

  const value: SessionValue = {
    user: state.user,
    signOut: async () => {
      await logout();
      setAccessToken(null);
      router.replace('/login');
      router.refresh();
    },
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
