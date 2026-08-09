'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';
import { Button } from './Button';
import { Modal } from './Modal';
import { Skeleton } from './Skeleton';

/**
 * Loading, error, and confirmation surfaces. Previously every page rendered a
 * bare `<p>Loading…</p>` and a bare red `<p>` for failures, which gave no sense
 * of the shape of the incoming content and no way to recover from an error.
 */

const ALERT_TONE = {
  error: 'border-danger-500/25 bg-danger-50 text-danger-700',
  warning: 'border-warning-500/25 bg-warning-50 text-warning-700',
  success: 'border-success-500/25 bg-success-50 text-success-700',
  info: 'border-info-500/25 bg-info-50 text-info-700',
} as const;

export interface AlertProps {
  tone?: keyof typeof ALERT_TONE | undefined;
  title?: string | undefined;
  children?: ReactNode | undefined;
  /** Recovery action, e.g. Retry. */
  action?: ReactNode | undefined;
  className?: string | undefined;
}

export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  return (
    <div
      // `alert` for failures so screen readers announce them; status otherwise.
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-3 rounded-md border p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
        ALERT_TONE[tone],
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Full-block error state with a retry affordance. */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}) {
  return (
    <Alert
      tone="error"
      title="Something went wrong"
      className={className}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}

/** Skeleton matching a row of stat tiles. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 [@media(min-width:900px)]:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface-card p-4 sm:p-5">
          <Skeleton width="55%" height={14} />
          <Skeleton className="mt-3" width="70%" height={28} />
          <Skeleton className="mt-3" width="40%" height={12} />
        </div>
      ))}
    </div>
  );
}

/** Skeleton matching a table body, so layout does not jump when data lands. */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} width={c === 0 ? '28%' : '16%'} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Generic stacked-card skeleton for list and form screens. */
export function BlockSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface-card p-5', className)} aria-hidden>
      <Skeleton width="35%" height={16} />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={12} />
        ))}
      </div>
    </div>
  );
}

/** Announces a busy region to assistive tech while showing a spinner. */
export function LoadingRow({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 px-1 py-8 text-sm text-muted-foreground">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand-600"
      />
      {label}
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  /** `danger` for destructive actions — reject, suspend, delete. */
  tone?: 'primary' | 'danger' | undefined;
  loading?: boolean | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replaces `window.confirm`, which cannot be styled, is not keyboard-trappable,
 * and gives no room to explain what the action will actually do.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
