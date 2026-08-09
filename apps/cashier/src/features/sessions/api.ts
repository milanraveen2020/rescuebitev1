import { ListingSchema, type Listing } from '@rescuebite/types';
import { z } from 'zod';
import { apiRequest } from '@/lib/api-session';

/**
 * The counter is read-only: listings are created and managed in the merchant
 * app, and the cashier simply surfaces the active ones and runs handovers. A
 * "session" here is just a `Listing` whose pickup window is open.
 */

const ListingsSchema = z.array(ListingSchema);

export async function listListings(): Promise<Listing[]> {
  return ListingsSchema.parse(await apiRequest('/merchant/listings'));
}

export async function getListing(id: string): Promise<Listing> {
  return ListingSchema.parse(await apiRequest(`/merchant/listings/${id}`));
}

/** The live session, if any: an ACTIVE listing whose pickup window is open. */
export function findLiveSession(listings: Listing[], now: number): Listing | null {
  const live = listings
    .filter((l) => l.status === 'ACTIVE' && new Date(l.pickupEnd).getTime() > now)
    .sort((a, b) => new Date(b.pickupStart).getTime() - new Date(a.pickupStart).getTime());
  return live[0] ?? null;
}

/** Sessions that have finished — the History list. */
export function pastSessions(listings: Listing[], now: number): Listing[] {
  return listings
    .filter(
      (l) =>
        l.status === 'EXPIRED' ||
        l.status === 'SOLD_OUT' ||
        (l.status === 'ACTIVE' && new Date(l.pickupEnd).getTime() <= now),
    )
    .sort((a, b) => new Date(b.pickupStart).getTime() - new Date(a.pickupStart).getTime());
}
