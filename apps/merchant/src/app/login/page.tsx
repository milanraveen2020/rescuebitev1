'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { LoginSchema, type UserRole } from '@rescuebite/types';
import { Button, Input } from '@rescuebite/ui/web';
import { AuthError, login, logout } from '@/lib/auth';
import { Logo } from '@/features/shell/Logo';

/** Roles the merchant app serves. Anything else is sent back to the login form. */
const MERCHANT_ROLES: readonly UserRole[] = ['MERCHANT_OWNER', 'MERCHANT_STAFF'];

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
      const session = await login(parsed.data.email, parsed.data.password);
      // Stop non-merchant accounts here. Letting one through sets the refresh
      // cookie, and the app shell would then dead-end on a 403 from the API with
      // the middleware bouncing /login back to / — no way out but clearing cookies.
      if (!MERCHANT_ROLES.includes(session.user.role)) {
        await logout();
        setError('This isn’t a merchant account. Please sign in with your store login.');
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
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-surface-page bg-brand-glow p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="items-center" lockupClassName="h-[2rem]" />
          <p className="mt-4 text-sm text-neutral-600">
            Turn today&rsquo;s surplus into tomorrow&rsquo;s regulars.
          </p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-surface-card p-6 shadow-card-lg">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold text-neutral-900">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to manage your store.</p>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-danger-500/20 bg-danger-50 p-3 text-sm text-danger-600"
              >
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

            <Button type="submit" loading={submitting} block size="lg">
              Log in
            </Button>
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" aria-hidden />
          Fighting food waste, one surprise bag at a time.
        </p>
      </div>
    </main>
  );
}
