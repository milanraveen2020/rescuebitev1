'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Banknote, CheckCircle2, ExternalLink } from 'lucide-react';
import type { ConnectStatus, Transfer } from '@rescuebite/types';
import {
  Alert,
  Badge,
  BlockSkeleton,
  Button,
  EmptyState,
  ErrorState,
  PageBody,
  PageHeader,
  Section,
  StatCard,
  StatGrid,
} from '@rescuebite/ui/web';
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

  const load = useCallback(() => {
    setState({ status: 'loading' });
    Promise.all([getConnectStatus(), listTransfers().catch(() => [])])
      .then(([connect, transfers]) => setState({ status: 'ready', connect, transfers }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ApiRequestError ? e.message : 'Failed to load payouts.',
        }),
      );
  }, []);

  useEffect(load, [load]);

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

  const connect = state.status === 'ready' ? state.connect : null;
  const transfers = state.status === 'ready' ? state.transfers : [];
  const paidOut = transfers.reduce((sum, t) => sum + t.amountMinor, 0);

  return (
    <PageBody>
      <PageHeader
        title="Payouts"
        description="Connect Stripe to accept payments and receive payouts. Mystery Box takes a small platform commission on each sale."
        actions={
          connect ? (
            <Badge
              tone={connect.payoutsEnabled ? 'success' : 'warning'}
              dot
              className="h-[2.25rem] px-3 text-sm"
            >
              {connect.payoutsEnabled ? 'Payouts enabled' : 'Setup incomplete'}
            </Badge>
          ) : null
        }
      />

      {state.status === 'loading' ? <BlockSkeleton lines={4} /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'ready' && connect ? (
        <>
          {/*
            The blocking condition leads the page. Previously you had to read three
            neutral status rows and infer that you could not get paid yet.
          */}
          {!connect.payoutsEnabled ? (
            <Alert
              tone="warning"
              title={connect.connected ? 'Finish your Stripe setup' : 'Connect Stripe to get paid'}
              action={
                <Button onClick={() => void onConnect()} loading={redirecting}>
                  {connect.connected ? 'Continue setup' : 'Connect with Stripe'}
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Button>
              }
            >
              Customers cannot pay for your bags until Stripe onboarding is complete.
            </Alert>
          ) : (
            <Alert tone="success" title="You're all set">
              Orders are being accepted and payouts land in your connected account.
            </Alert>
          )}

          {actionError ? <Alert tone="error">{actionError}</Alert> : null}

          <StatGrid>
            <StatCard
              label="Total paid out"
              value={formatMoney(paidOut, transfers[0]?.currency ?? 'EUR')}
              icon={<Banknote className="h-4 w-4" />}
              hint={`${transfers.length} transfer${transfers.length === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Stripe account"
              value={connect.connected ? 'Connected' : 'Not connected'}
              icon={
                connect.connected ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )
              }
            />
            <StatCard
              label="Details submitted"
              value={connect.detailsSubmitted ? 'Complete' : 'Incomplete'}
              icon={
                connect.detailsSubmitted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )
              }
            />
            <StatCard
              label="Payouts"
              value={connect.payoutsEnabled ? 'Enabled' : 'Disabled'}
              icon={
                connect.payoutsEnabled ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )
              }
              emphasis={connect.payoutsEnabled}
            />
          </StatGrid>

          <Section
            title="Recent transfers"
            description={transfers.length > 0 ? 'Money sent to your bank account.' : undefined}
            bodyClassName="p-0"
          >
            {transfers.length === 0 ? (
              <EmptyState
                icon={<Banknote className="h-7 w-7" aria-hidden />}
                title="No transfers yet"
                description="Payouts appear here once you start making sales."
                className="py-[2.5rem]"
              />
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">Recent Stripe transfers</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {transfers.map((t) => (
                    <tr key={t.id} className="transition hover:bg-surface-raised/50">
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="nums px-5 py-3 text-right font-semibold text-neutral-900">
                        {formatMoney(t.amountMinor, t.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      ) : null}
    </PageBody>
  );
}
