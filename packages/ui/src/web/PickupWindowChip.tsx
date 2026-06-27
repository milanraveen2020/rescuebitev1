import { cn } from './cn';

export interface PickupWindowChipProps {
  /** ISO date-time strings. */
  start: string;
  end: string;
  className?: string;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function dayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(date);
}

/** Compact "pick up" window chip, e.g. "Today · 5:00–7:00 PM". */
export function PickupWindowChip({ start, end, className }: PickupWindowChipProps) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const label = `${dayLabel(startDate)} · ${timeFmt.format(startDate)}–${timeFmt.format(endDate)}`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800',
        className,
      )}
    >
      <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden fill="currentColor">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 3.5a.75.75 0 00-1.5 0V8c0 .2.08.39.22.53l2 2a.75.75 0 101.06-1.06L8.75 7.69V4.5z" />
      </svg>
      {label}
    </span>
  );
}
