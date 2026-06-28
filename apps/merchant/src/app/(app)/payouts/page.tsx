'use client';

import { useEffect, useState } from 'react';
import type { ConnectStatus, Transfer } from '@rescuebite/types';
import { Badge, Button, Card } from '@rescuebite/ui/web';
import { getConnectStatus, listTransfers, startOnboarding } from '@/features/payouts/api';
import { ApiRequestError } from '@/lib/request';
import { formatMoney } from '@/lib/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; connect: ConnectStatus; transfers: Transfer[] }
  | { status: 'error'; message: string };

export default function PayoutsPage() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [redirecting, setRedirecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function load(): void {
    setState({ status: 'loading' });
    Promise.all([getConnectStatus(), listTransfers().catch(() => [])])
      .then(([connect, transfers]) => setState({ status: 'ready', connect, transfers }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ApiRequestError ? e.message : 'Failed to load payouts.',
        }),
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
      setActionError(e instanceof ApiRequestError ? e.message : 'Could not start onboarding.');
      setRedirecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Connect Stripe to accept payments and receive payouts. RescueBite takes a small platform
          commission on each sale.
        </p>
      </header>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? (
        <div className="space-y-3">
          <p className="text-danger-600">{state.message}</p>
          <button onClick={load} className="rounded-md border px-4 py-2 text-sm font-medium">
            Retry
          </button>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <Card className="space-y-5">
            <Row
              label="Stripe account"
              value={state.connect.connected ? 'Connected' : 'Not connected'}
              ok={state.connect.connected}
            />
            <Row
              label="Details submitted"
              value={state.connect.detailsSubmitted ? 'Yes' : 'Incomplete'}
              ok={state.connect.detailsSubmitted}
            />
            <Row
              label="Payouts enabled"
              value={state.connect.payoutsEnabled ? 'Enabled' : 'Disabled'}
              ok={state.connect.payoutsEnabled}
            />

            {actionError ? <p className="text-sm text-danger-600">{actionError}</p> : null}

            {state.connect.payoutsEnabled ? (
              <p className="text-sm text-brand-700">
                You&apos;re all set to accept orders and receive payouts.
              </p>
            ) : (
              <Button onClick={() => void onConnect()} loading={redirecting}>
                {state.connect.connected ? 'Continue Stripe onboarding' : 'Connect with Stripe'}
              </Button>
            )}
          </Card>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-neutral-900">
              Recent transfers
            </h2>
            {state.transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transfers yet. Payouts appear here once you start making sales.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border bg-white">
                {state.transfers.map((t) => (
                  <li key={t.id} className="flex items-center justify-between p-4">
                    <span className="text-sm text-neutral-600">
                      {new Date(t.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {formatMoney(t.amountMinor, t.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-neutral-700">{label}</span>
      <Badge tone={ok ? 'brand' : 'neutral'}>{value}</Badge>
    </div>
  );
}
