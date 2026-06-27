'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@rescuebite/types';
import { logout, refreshSession } from '@/lib/auth';

type State =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string };

export default function MerchantHomePage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => {
        if (active) setState({ status: 'ready', user: session.user });
      })
      .catch(() => {
        // Expired/invalid session — bounce to login.
        if (active) router.replace('/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function onSignOut() {
    await logout();
    router.replace('/login');
    router.refresh();
  }

  if (state.status === 'loading') {
    return <CenteredNote>Loading your dashboard…</CenteredNote>;
  }
  if (state.status === 'error') {
    return <CenteredNote>{state.message}</CenteredNote>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-brand-700">Merchant Dashboard</h1>
        <button
          onClick={() => void onSignOut()}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Sign out
        </button>
      </header>
      <p className="text-muted-foreground">
        Signed in as <span className="font-medium text-neutral-800">{state.user.email}</span> (
        {state.user.role}). Your store tools will live here.
      </p>
    </main>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
      {children}
    </main>
  );
}
