'use client';

import { useEffect, useState } from 'react';
import type { ConnectStatus } from '@rescuebite/types';
import { getConnectStatus, startOnboarding } from '@/features/payouts/api';

type State =
  | { status: 'loading' }
  | { status: 'ready'; connect: ConnectStatus }
  | { status: 'error'; message: string };

export default function PayoutsPage() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [redirecting, setRedirecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function load(): void {
    setState({ status: 'loading' });
    getConnectStatus()
      .then((connect) => setState({ status: 'ready', connect }))
      .catch((e: unknown) =>
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load.' }),
      );
  }

  useEffect(load, []);

  async function onConnect(): Promise<void> {
    setActionError(null);
    setRedirecting(true);
    try {
      const { url } = await startOnboarding();
      window.location.href = url;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not start onboarding.');
      setRedirecting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-3xl font-bold text-brand-700">Payouts</h1>
      <p className="text-muted-foreground">
        Connect your Stripe account to accept payments and receive payouts. RescueBite takes a small
        platform commission on each sale.
      </p>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? (
        <div className="space-y-3">
          <p className="text-red-600">{state.message}</p>
          <button onClick={load} className="rounded-md border px-4 py-2 text-sm font-medium">
            Retry
          </button>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <div className="space-y-5 rounded-lg border bg-white p-6">
          <Row label="Stripe account" value={state.connect.connected ? 'Connected' : 'Not connected'} ok={state.connect.connected} />
          <Row label="Details submitted" value={state.connect.detailsSubmitted ? 'Yes' : 'Incomplete'} ok={state.connect.detailsSubmitted} />
          <Row label="Payouts enabled" value={state.connect.payoutsEnabled ? 'Enabled' : 'Disabled'} ok={state.connect.payoutsEnabled} />

          {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

          {state.connect.payoutsEnabled ? (
            <p className="text-sm text-brand-700">
              You&apos;re all set to accept orders and receive payouts.
            </p>
          ) : (
            <button
              onClick={() => void onConnect()}
              disabled={redirecting}
              className="rounded-md bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {redirecting
                ? 'Redirecting…'
                : state.connect.connected
                  ? 'Continue Stripe onboarding'
                  : 'Connect with Stripe'}
            </button>
          )}
        </div>
      ) : null}
    </main>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-neutral-700">{label}</span>
      <span className={`text-sm font-medium ${ok ? 'text-brand-700' : 'text-neutral-500'}`}>
        {value}
      </span>
    </div>
  );
}
