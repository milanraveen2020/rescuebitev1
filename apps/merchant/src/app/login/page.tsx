'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginSchema } from '@rescuebite/types';
import { Button, Card, Input } from '@rescuebite/ui/web';
import { AuthError, login } from '@/lib/auth';

export default function MerchantLoginPage() {
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
      await login(parsed.data.email, parsed.data.password);
      router.replace(params.get('next') ?? '/');
      router.refresh();
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <Card className="w-full max-w-sm shadow-md">
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-brand-700">RescueBite Merchants</h1>
            <p className="text-sm text-neutral-500">Sign in to manage your store.</p>
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
            placeholder="you@store.com"
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
