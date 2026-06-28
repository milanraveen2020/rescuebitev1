'use client';

import { type ReactNode } from 'react';
import { Button, Modal } from '@rescuebite/ui/web';

interface ReasonField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  reason?: ReasonField;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation dialog for destructive/important admin actions, with an optional reason. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  reason,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const blocked = reason?.required ? reason.value.trim().length === 0 : false;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {message ? <div className="text-sm text-neutral-600">{message}</div> : null}

        {reason ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-neutral-700">{reason.label}</span>
            <textarea
              rows={3}
              value={reason.value}
              onChange={(e) => reason.onChange(e.target.value)}
              placeholder={reason.placeholder}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            loading={loading}
            disabled={blocked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
