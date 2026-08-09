'use client';

import { type ReactNode } from 'react';
import { Button, Modal, Textarea } from '@rescuebite/ui/web';

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
        {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}

        {reason ? (
          <Textarea
            label={reason.label}
            required={reason.required}
            rows={3}
            value={reason.value}
            onChange={(e) => reason.onChange(e.target.value)}
            placeholder={reason.placeholder}
            hint={
              reason.required
                ? 'Required — recorded in the audit log.'
                : 'Optional — recorded in the audit log.'
            }
          />
        ) : null}

        {/* Reverse column order on mobile puts the confirm action under the thumb. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
