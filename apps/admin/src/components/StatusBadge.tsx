import { Badge, type BadgeProps } from '@rescuebite/ui/web';
import { humanize } from '@/lib/format';

type Tone = NonNullable<BadgeProps['tone']>;

/**
 * Semantic tone per status. Previously everything settled was brand-green and
 * everything mid-flight was amber, so "Refunded" read the same as "Rejected" and
 * "Expired" the same as a real failure. Now the tone carries meaning:
 * green = settled/good, blue = in progress, amber = needs attention,
 * red = bad outcome, grey = terminal but unremarkable.
 */
const TONES: Record<string, Tone> = {
  // Stores
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  // Users
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  // Listings
  DRAFT: 'neutral',
  SOLD_OUT: 'info',
  EXPIRED: 'neutral',
  // Orders
  RESERVED: 'warning',
  PAID: 'info',
  COLLECTED: 'success',
  CANCELLED: 'neutral',
  REFUNDED: 'warning',
  NO_SHOW: 'danger',
};

/** Renders any platform status enum as a tone-mapped badge with a status dot. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={TONES[status] ?? 'neutral'} dot>
      {humanize(status)}
    </Badge>
  );
}
