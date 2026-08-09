'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { UserSchema, type User } from '@rescuebite/types';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { apiRequest, ApiRequestError, jsonInit } from '@/lib/api-session';

async function changePassword(currentPassword: string, newPassword: string): Promise<User> {
  return UserSchema.parse(
    await apiRequest('/auth/change-password', jsonInit('POST', { currentPassword, newPassword })),
  );
}

/**
 * Shown instead of the counter while `mustChangePassword` is set — i.e. the owner
 * invited this account with a temporary password they read out loud. Replacing it
 * here is what retires that credential.
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-page p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-xl font-bold text-neutral-900">Choose your password</h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            Your manager set this account up with a temporary password. Pick your own to start
            taking pickups.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-surface-card p-6 shadow-sm">
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
              leftIcon={<Lock className="h-4 w-4" aria-hidden />}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              leftIcon={<Lock className="h-4 w-4" aria-hidden />}
              hint="At least 8 characters."
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              leftIcon={<Lock className="h-4 w-4" aria-hidden />}
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
