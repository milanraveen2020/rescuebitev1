import type { CSSProperties } from 'react';
import { cn } from './cn';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}

/** Shimmer placeholder for loading states. */
export function Skeleton({ width = '100%', height = 16, radius = 8, className }: SkeletonProps) {
  const style: CSSProperties = { width, height, borderRadius: radius };
  return (
    <span
      aria-hidden
      className={cn(
        'block animate-shimmer bg-[length:400%_100%] bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100',
        className,
      )}
      style={style}
    />
  );
}
