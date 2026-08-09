import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-page bg-brand-glow p-6 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="mt-5 font-display text-2xl font-extrabold text-neutral-900">You’re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-neutral-600">
        Mystery Box needs a connection to verify orders and complete handovers. We’ll pick up right
        where you left off once you’re back.
      </p>
      <Link
        href="/session/active"
        className="tap mt-6 inline-flex h-12 items-center rounded-lg bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800"
      >
        Try again
      </Link>
    </main>
  );
}
