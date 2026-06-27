import { cn } from './cn';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Avatar with a graceful initials fallback when no image is available. */
export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-pill object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-pill bg-brand-100 font-semibold text-brand-800',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
