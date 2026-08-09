'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Button } from './ui';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

/** Accessible modal bottom sheet: backdrop click + Escape close, focus moves in. */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-neutral-900/50 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md rounded-t-2xl bg-surface-card p-5 pb-safe shadow-pop outline-none animate-sheet-up sm:rounded-2xl sm:pb-5',
          className,
        )}
      >
        <div
          className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-300 sm:hidden"
          aria-hidden
        />
        <h2 id="sheet-title" className="font-display text-lg font-bold text-neutral-900">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps extends Omit<BottomSheetProps, 'children'> {
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}

/** Confirmation sheet with a summary body and a Cancel/Confirm action pair. */
export function ConfirmationBottomSheet({
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading,
  onConfirm,
  onClose,
  children,
  ...rest
}: ConfirmProps) {
  return (
    <BottomSheet onClose={onClose} {...rest}>
      {children ? <div className="mb-5">{children}</div> : null}
      <div className="flex gap-3">
        <Button variant="outline" block size="lg" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} block size="lg" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
