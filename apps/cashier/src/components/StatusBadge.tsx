import { CheckCircle2, Clock, PackageCheck, TimerOff, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OrderStatus, SessionStatus } from '@/lib/types';

interface BadgeSpec {
  label: string;
  icon: LucideIcon;
  className: string;
}

const ORDER: Record<OrderStatus, BadgeSpec> = {
  ready: {
    label: 'Ready',
    icon: PackageCheck,
    className: 'bg-info-50 text-info-700 ring-info-500/25',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-success-50 text-success-700 ring-success-500/25',
  },
};

const SESSION: Record<SessionStatus, BadgeSpec> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    className: 'bg-neutral-100 text-neutral-600 ring-neutral-400/30',
  },
  active: {
    label: 'Live',
    icon: CheckCircle2,
    className: 'bg-success-50 text-success-700 ring-success-500/25',
  },
  sold_out: {
    label: 'Sold Out',
    icon: PackageCheck,
    className: 'bg-warning-50 text-warning-700 ring-warning-500/25',
  },
  time_ended: {
    label: 'Time Ended',
    icon: TimerOff,
    className: 'bg-danger-50 text-danger-700 ring-danger-500/25',
  },
  stopped: {
    label: 'Stopped',
    icon: TimerOff,
    className: 'bg-neutral-100 text-neutral-600 ring-neutral-400/30',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-brand-100 text-brand-800 ring-brand-500/30',
  },
};

function Badge({
  spec,
  size = 'md',
  pulse,
}: {
  spec: BadgeSpec;
  size?: 'sm' | 'md' | undefined;
  pulse?: boolean | undefined;
}) {
  const Icon = spec.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-semibold ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]',
        spec.className,
      )}
    >
      <Icon
        className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', pulse && 'animate-pulse')}
        aria-hidden
      />
      {spec.label}
    </span>
  );
}

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  return <Badge spec={ORDER[status]} size={size} />;
}

export function SessionStatusBadge({
  status,
  size,
}: {
  status: SessionStatus;
  size?: 'sm' | 'md';
}) {
  return <Badge spec={SESSION[status]} size={size} pulse={status === 'active'} />;
}
