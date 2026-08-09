import type { ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  icon?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-3 px-6 py-[2.75rem] text-center', className)}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-brand-600">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-base font-semibold text-neutral-900">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
