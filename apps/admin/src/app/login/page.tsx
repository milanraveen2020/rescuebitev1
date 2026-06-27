'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginSchema } from '@rescuebite/types';
import { AuthError, login, logout } from '@/lib/auth';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }
    setSubmitting(true);
    try {
      const session = await login(parsed.data.email, parsed.data.password);
      // Admin console is ADMIN-only — reject and clear the session otherwise.
      if (session.user.role !== 'ADMIN') {
        await logout();
        setError('This console is for administrators only.');
        return;
      }
      router.replace(params.get('next') ?? '/');
      router.refresh();
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm space-y-5 rounded-lg bg-white p-8 shadow-lg"
        noValidate
      >
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-neutral-900">RescueBite Admin</h1>
          <p className="text-sm text-muted-foreground">Administrator access only.</p>
        </div>

        {error ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="admin@rescuebite.com"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="Your password"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-md bg-neutral-900 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </main>
  );
}
