import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,#e3dccf_25%,#efe9df_37%,#e3dccf_63%)] bg-[length:400%_100%]',
        className,
      )}
      aria-hidden
    />
  );
}

/** Skeleton placeholder matching the OrderCard layout. */
export function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-surface-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-20 rounded-pill" />
      </div>
      <Skeleton className="mt-3 h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-32" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function OrderListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading orders" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}
