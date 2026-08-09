import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'accent';

const TONE: Record<Tone, { icon: string; value: string }> = {
  brand: { icon: 'bg-brand-100 text-brand-700', value: 'text-neutral-900' },
  neutral: { icon: 'bg-neutral-100 text-neutral-600', value: 'text-neutral-900' },
  success: { icon: 'bg-success-50 text-success-600', value: 'text-success-700' },
  warning: { icon: 'bg-warning-50 text-warning-600', value: 'text-warning-700' },
  accent: { icon: 'bg-accent-100 text-accent-700', value: 'text-neutral-900' },
};

export function StatsCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-surface-card p-3.5 shadow-card">
      <span
        className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', t.icon)}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={cn('font-display text-2xl font-extrabold leading-none', t.value)}>{value}</p>
        <p className="mt-1 text-xs font-medium text-neutral-500">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-neutral-400">{hint}</p> : null}
      </div>
    </div>
  );
}
