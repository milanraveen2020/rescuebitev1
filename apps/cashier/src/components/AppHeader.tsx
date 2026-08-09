'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/useOnline';
import { LogoMark } from './Logo';

interface AppHeaderProps {
  title: string;
  subtitle?: string | undefined;
  backHref?: string | undefined;
  onBack?: (() => void) | undefined;
  right?: ReactNode | undefined;
}

export function AppHeader({ title, subtitle, backHref, onBack, right }: AppHeaderProps) {
  const online = useOnline();
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-surface-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
        {backHref || onBack ? (
          <BackButton backHref={backHref} onBack={onBack} />
        ) : (
          <LogoMark className="h-8 w-8" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold leading-tight text-neutral-900">
            {title}
          </h1>
          {subtitle ? <p className="truncate text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <ConnectionDot online={online} />
          {right}
        </div>
      </div>
    </header>
  );
}

function BackButton({
  backHref,
  onBack,
}: {
  backHref?: string | undefined;
  onBack?: (() => void) | undefined;
}) {
  const className =
    'tap -ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-neutral-700 hover:bg-surface-raised';
  if (backHref) {
    return (
      <Link href={backHref} aria-label="Go back" className={className}>
        <ChevronLeft className="h-6 w-6" aria-hidden />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onBack} aria-label="Go back" className={className}>
      <ChevronLeft className="h-6 w-6" aria-hidden />
    </button>
  );
}

function ConnectionDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={online ? 'Online' : 'Offline'}>
      <span
        className={cn('h-2.5 w-2.5 rounded-full', online ? 'bg-success-500' : 'bg-warning-500')}
        aria-hidden
      />
      <span className="sr-only">{online ? 'Online' : 'Offline'}</span>
    </span>
  );
}
