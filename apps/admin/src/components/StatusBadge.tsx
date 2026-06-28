import { Badge } from '@rescuebite/ui/web';
import { humanize } from '@/lib/format';

type Tone = 'neutral' | 'brand' | 'accent' | 'danger';

const TONES: Record<string, Tone> = {
  // Stores
  APPROVED: 'brand',
  PENDING: 'accent',
  REJECTED: 'danger',
  // Users
  ACTIVE: 'brand',
  SUSPENDED: 'danger',
  // Listings
  DRAFT: 'neutral',
  SOLD_OUT: 'accent',
  EXPIRED: 'danger',
  // Orders
  RESERVED: 'accent',
  PAID: 'brand',
  COLLECTED: 'neutral',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
  NO_SHOW: 'danger',
};

/** Renders any platform status enum as a tone-mapped badge. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? 'neutral'}>{humanize(status)}</Badge>;
}
