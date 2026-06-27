'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginSchema } from '@rescuebite/types';
import { Button, Card, Input } from '@rescuebite/ui/web';
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
      <Card className="w-full max-w-sm shadow-xl">
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-neutral-900">RescueBite Admin</h1>
            <p className="text-sm text-neutral-500">Administrator access only.</p>
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
              {error}
            </p>
          ) : null}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@rescuebite.com"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />

          <Button type="submit" loading={submitting} block>
            Log in
          </Button>
        </form>
      </Card>
    </main>
  );
}
