'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** 'center' is a dialog; 'sheet' slides up from the bottom (mobile-friendly). */
  variant?: 'center' | 'sheet';
}

export function Modal({ open, onClose, title, children, variant = 'center' }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in bg-neutral-900/40 p-4"
      style={{ alignItems: variant === 'sheet' ? 'flex-end' : 'center', justifyContent: 'center' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full animate-scale-in bg-white p-6 shadow-xl',
          variant === 'sheet' ? 'max-w-lg rounded-t-xl' : 'max-w-md rounded-xl',
        )}
      >
        {title ? (
          <h2 className="mb-3 font-display text-lg font-semibold text-neutral-900">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
