'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Store, User } from '@rescuebite/types';
import { AuthError, logout, refreshSession } from '@/lib/auth';
import { setAccessToken } from '@/lib/session';
import { getStore } from '@/features/store/api';

interface SessionValue {
  user: User;
  store: Store;
  /** Owners get the full dashboard; staff are limited to fulfillment. */
  isOwner: boolean;
  setStore: (store: Store) => void;
  signOut: () => Promise<void>;
}

const SessionCtx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionCtx);
  if (!value) throw new Error('useSession must be used within <SessionProvider>.');
  return value;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; user: User; store: Store }
  | { status: 'error'; message: string };

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await refreshSession();
        if (!active) return;
        setAccessToken(session.accessToken);
        const store = await getStore();
        if (active) setState({ status: 'ready', user: session.user, store });
      } catch (e) {
        if (!active) return;
        // An auth failure means the session is gone. Clear the (now-stale) refresh
        // cookie first — otherwise the middleware keeps seeing it and bounces us
        // back from /login to /, looping forever on "Loading your store…".
        if (e instanceof AuthError) {
          setAccessToken(null);
          await logout();
          router.replace('/login');
        } else {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not load your store.',
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (state.status === 'loading') {
    return <CenteredNote>Loading your store…</CenteredNote>;
  }
  if (state.status === 'error') {
    return <CenteredNote>{state.message}</CenteredNote>;
  }

  const value: SessionValue = {
    user: state.user,
    store: state.store,
    isOwner: state.user.role === 'MERCHANT_OWNER',
    setStore: (store) => setState((s) => (s.status === 'ready' ? { ...s, store } : s)),
    signOut: async () => {
      await logout();
      setAccessToken(null);
      router.replace('/login');
      router.refresh();
    },
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
      {children}
    </main>
  );
}
