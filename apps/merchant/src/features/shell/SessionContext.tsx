'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiErrorCode, Store, User } from '@rescuebite/types';
import { Button } from '@rescuebite/ui/web';
import { AuthError, logout, refreshSession } from '@/lib/auth';
import { setAccessToken } from '@/lib/session';
import { getStore } from '@/features/store/api';
import { initMonitoring } from '@/lib/monitoring';
import { ChangePassword } from './ChangePassword';

// Initialize error monitoring once on the client (no-op unless a DSN is set).
initMonitoring();

interface SessionValue {
  user: User;
  store: Store;
  /** Owners get the full dashboard; staff are limited to fulfillment. */
  isOwner: boolean;
  setStore: (store: Store) => void;
  signOut: () => Promise<void>;
}

/** Error codes that mean the session itself is rejected, not that the call failed. */
const SESSION_GONE_CODES: readonly ApiErrorCode[] = ['unauthenticated', 'forbidden'];

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
        // Only a rejected session should bounce to /login: logout() clears the
        // httpOnly refresh cookie so the middleware stops seeing it. An
        // unreachable API can't clear it, so redirecting would loop /login → /
        // forever on "Loading your store…" — fall through to the error state.
        if (e instanceof AuthError && SESSION_GONE_CODES.includes(e.code)) {
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
    // Always offer a way out: the refresh cookie is still set, so the middleware
    // would bounce a manual trip to /login straight back here.
    return (
      <CenteredNote>
        <p>{state.message}</p>
        <Button
          variant="secondary"
          onClick={() => {
            void (async () => {
              await logout();
              setAccessToken(null);
              router.replace('/login');
              router.refresh();
            })();
          }}
        >
          Sign out
        </Button>
      </CenteredNote>
    );
  }

  // An admin-provisioned account must set its own password before anything else.
  if (state.user.mustChangePassword) {
    return (
      <ChangePassword
        onDone={(user) => setState((s) => (s.status === 'ready' ? { ...s, user } : s))}
      />
    );
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center text-muted-foreground">
      {children}
    </main>
  );
}
