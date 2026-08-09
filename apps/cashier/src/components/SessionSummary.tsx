import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import type { SessionStats } from '@/features/sessions/stats';

export function CompletionRing({ percent }: { percent: number }) {
  const size = 128;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percent / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e3dccf" strokeWidth={12} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#436b59"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold text-neutral-900">{percent}%</span>
        <span className="text-[11px] font-medium text-neutral-500">completed</span>
      </div>
    </div>
  );
}

export function SoldBar({ sold, remaining }: { sold: number; remaining: number }) {
  const total = Math.max(1, sold + remaining);
  const soldPct = (sold / total) * 100;
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-pill bg-surface-sunken">
        <div className="h-full bg-brand-600" style={{ width: `${soldPct}%` }} aria-hidden />
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium text-neutral-500">
        <span>
          <span className="font-bold text-brand-700">{sold}</span> sold
        </span>
        <span>
          <span className="font-bold text-neutral-700">{remaining}</span> unsold
        </span>
      </div>
    </div>
  );
}

const BREAKDOWN: { key: keyof SessionStats; label: string; dot: string }[] = [
  { key: 'completed', label: 'Completed', dot: 'bg-success-500' },
  { key: 'ready', label: 'Ready (awaiting)', dot: 'bg-info-500' },
];

export function StatusBreakdown({ stats }: { stats: SessionStats }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {BREAKDOWN.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2"
        >
          <span className="flex items-center gap-2 text-sm text-neutral-600">
            <span className={cn('h-2.5 w-2.5 rounded-full', row.dot)} aria-hidden />
            {row.label}
          </span>
          <span className="font-display font-bold text-neutral-900">{stats[row.key]}</span>
        </li>
      ))}
    </ul>
  );
}

export function MoneyRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-neutral-500">{label}</span>
      <span
        className={cn(
          'font-display font-bold',
          strong ? 'text-lg text-brand-800' : 'text-neutral-900',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function formatSummaryMoney(minor: number): string {
  return formatMoney(minor, 'LKR');
}
