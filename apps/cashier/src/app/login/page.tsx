'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Download, Eye, EyeOff, Lock, Mail, Sparkles, WifiOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button, Input } from '@/components/ui';
import { LoginError, useAuth } from '@/lib/auth';
import { useOnline } from '@/lib/useOnline';
import { useInstallPrompt } from '@/lib/useInstallPrompt';

const Credentials = z.object({
  // Checked as an email here, not just non-empty: the API only accepts an address,
  // and catching a typo locally gives a message on the field instead of a generic
  // "some of the details need a second look" banner from the server.
  email: z
    .string()
    .min(1, 'Enter your staff email.')
    .email('That doesn’t look like an email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();
  const online = useOnline();
  const { canInstall, promptInstall } = useInstallPrompt();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string | undefined;
    password?: string | undefined;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = Credentials.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password, remember);
      router.replace(params.get('next') ?? '/session/active');
      router.refresh();
    } catch (e) {
      setError(e instanceof LoginError ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-surface-page bg-brand-glow">
      {/* Brand hero */}
      <div className="relative flex flex-col items-center px-6 pb-8 pt-16 text-center">
        <Logo className="items-center" lockupClassName="h-11" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-neutral-900">Welcome back</h1>
        <p className="mt-1.5 max-w-xs text-sm text-neutral-600">
          Sign in to run today’s surprise-bag pickups at the counter.
        </p>
      </div>

      {/* Card */}
      <div className="flex flex-1 flex-col rounded-t-2xl border-t border-black/5 bg-surface-card px-6 pb-safe pt-7 shadow-card-lg">
        <div className="mx-auto w-full max-w-sm flex-1">
          {!online ? (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-lg bg-warning-50 p-3 text-sm font-medium text-warning-700"
            >
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
              You’re offline. Reconnect to sign in.
            </div>
          ) : null}

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
              label="Staff email"
              type="email"
              inputMode="email"
              autoComplete="username"
              leftIcon={<Mail className="h-4 w-4" aria-hidden />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              placeholder="you@store.com"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" aria-hidden />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              placeholder="Your password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="tap flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-5 w-5 rounded border-neutral-300 text-brand-700 accent-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
                />
                Remember me
              </label>
              <a href="#" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                Forgot password?
              </a>
            </div>

            <Button type="submit" block size="lg" loading={submitting} disabled={!online}>
              Log in
            </Button>
          </form>

          {canInstall ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100"
            >
              <Download className="h-4 w-4" aria-hidden />
              Install the Cashier app
            </button>
          ) : null}

          <p className="mt-6 rounded-lg bg-surface-raised p-3 text-center text-xs text-neutral-500">
            Your store owner creates your account and gives you a temporary password.
          </p>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-neutral-500">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" aria-hidden />
          Fighting food waste, one surprise bag at a time.
        </p>
      </div>
    </main>
  );
}
