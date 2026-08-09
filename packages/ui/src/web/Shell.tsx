'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from './cn';

/**
 * App-shell layout shared by the merchant and admin consoles.
 *
 * Both apps previously wrapped their content in a fixed narrow column
 * (`max-w-5xl` in merchant, `max-w-7xl` in admin), which wasted most of a
 * desktop viewport on tables that badly needed the width. `ShellContent` is
 * fluid instead: it fills the available space up to a generous `max-w-content`
 * and grows its gutters with the viewport, so wide screens gain content rather
 * than margin. Screens that genuinely need a narrow measure ask for it
 * explicitly via `<ShellContent width="prose">`.
 */

export function ShellFrame({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return <div className={cn('min-h-screen bg-surface-page lg:flex', className)}>{children}</div>;
}

/**
 * Desktop sidebar. `tone="dark"` is the admin console's operator chrome;
 * `tone="light"` is the merchant app's warm chrome.
 */
export function ShellSidebar({
  tone = 'light',
  className,
  children,
}: {
  tone?: 'light' | 'dark' | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <aside
      className={cn(
        // Sticky + own scroll: a long nav never pushes the page taller.
        'z-sidebar hidden w-[248px] shrink-0 flex-col self-start lg:sticky lg:top-0 lg:flex lg:h-screen xl:w-[264px]',
        tone === 'dark'
          ? 'border-r border-neutral-800 bg-neutral-900'
          : 'border-r border-line bg-surface-card',
        className,
      )}
    >
      {children}
    </aside>
  );
}

/** Scrollable middle region of the sidebar. */
export function ShellNav({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto px-3 py-4', className)}>{children}</div>
  );
}

/** Small caps label that groups related nav items. */
export function ShellNavGroup({
  label,
  className,
  children,
}: {
  label?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn('mb-4 last:mb-0', className)}>
      {label ? (
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
          {label}
        </p>
      ) : null}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

/** The scrolling content column. */
export function ShellMain({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return <main className={cn('flex min-w-0 flex-1 flex-col', className)}>{children}</main>;
}

export function ShellContent({
  width = 'wide',
  className,
  children,
}: {
  /** `wide` fills the viewport; `prose` constrains to a readable measure. */
  width?: 'wide' | 'prose' | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10',
        width === 'prose' ? 'mx-auto max-w-3xl' : 'mx-auto max-w-content',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mobile/tablet slide-in drawer. Locks body scroll and closes on Escape, which
 * the previous slide-down panel did neither of.
 */
export function ShellDrawer({
  open,
  onClose,
  tone = 'light',
  label = 'Menu',
  children,
}: {
  open: boolean;
  onClose: () => void;
  tone?: 'light' | 'dark' | undefined;
  label?: string | undefined;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-overlay lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-fade-in bg-neutral-900/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col shadow-xl',
          tone === 'dark' ? 'bg-neutral-900' : 'bg-surface-card',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Sticky bar above the content column. On mobile it carries the menu trigger and
 * brand; on desktop it hosts page-level context and account actions, so those
 * never scroll out of reach on a long table.
 */
export function ShellTopbar({
  tone = 'light',
  className,
  children,
}: {
  tone?: 'light' | 'dark' | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-topbar flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6 lg:px-8 xl:px-10',
        tone === 'dark'
          ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
          : 'border-line bg-surface-card/90 backdrop-blur',
        className,
      )}
    >
      {children}
    </header>
  );
}
