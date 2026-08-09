'use client';

import { useState } from 'react';
import { UserSchema, type User } from '@rescuebite/types';
import { Button, Input } from '@rescuebite/ui/web';
import { apiRequest, ApiRequestError, jsonInit } from '@/lib/request';
import { Logo } from './Logo';

async function changePassword(currentPassword: string, newPassword: string): Promise<User> {
  return UserSchema.parse(
    await apiRequest('/auth/change-password', jsonInit('POST', { currentPassword, newPassword })),
  );
}

/**
 * Shown instead of the app shell while `mustChangePassword` is set — i.e. after
 * an admin has provisioned the account with a temporary password.
 */
export function ChangePassword({ onDone }: { onDone: (user: User) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('Those passwords don’t match.');
      return;
    }
    setSubmitting(true);
    try {
      onDone(await changePassword(current, next));
    } catch (e) {
      setError(
        e instanceof ApiRequestError ? e.message : 'Could not change your password. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-page bg-brand-glow p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="items-center" lockupClassName="h-[2rem]" />
          <h1 className="mt-5 font-display text-xl font-bold text-neutral-900">
            Choose your password
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            Your account was set up with a temporary password. Pick your own to continue.
          </p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-surface-card p-6 shadow-card-lg">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-500/20 bg-danger-50 p-3 text-sm font-medium text-danger-600"
              >
                {error}
              </p>
            ) : null}

            <Input
              label="Temporary password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              hint="At least 8 characters."
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <Button type="submit" block loading={submitting}>
              Save and continue
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
