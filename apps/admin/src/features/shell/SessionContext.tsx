'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiErrorCode, User } from '@rescuebite/types';
import { Button } from '@rescuebite/ui/web';
import { AuthError, logout, refreshSession } from '@/lib/auth';
import { setAccessToken } from '@/lib/session';
import { initMonitoring } from '@/lib/monitoring';

// Initialize error monitoring once on the client (no-op unless a DSN is set).
initMonitoring();

interface SessionValue {
  user: User;
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
  { status: 'loading' } | { status: 'ready'; user: User } | { status: 'error'; message: string };

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
      .catch(async (e: unknown) => {
        if (!active) return;
        // Only a rejected session should bounce to /login: logout() clears the
        // httpOnly refresh cookie, so the middleware stops seeing it. For any
        // other failure (notably an unreachable API) that call can't succeed, the
        // cookie survives, and redirecting would loop /login → / forever on
        // "Loading the console…". Surface it instead.
        if (e instanceof AuthError && SESSION_GONE_CODES.includes(e.code)) {
          setAccessToken(null);
          await logout();
          router.replace('/login');
          return;
        }
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Could not load the console.',
        });
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (state.status === 'loading') {
    return <CenteredNote>Loading the console…</CenteredNote>;
  }
  if (state.status === 'error') {
    // The refresh cookie is httpOnly and still set, so a manual trip to /login
    // gets bounced back here by the middleware. Retry, or sign out to clear it.
    return (
      <CenteredNote>
        <p>{state.message}</p>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
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
        </div>
      </CenteredNote>
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

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center text-muted-foreground">
      {children}
    </main>
  );
}
