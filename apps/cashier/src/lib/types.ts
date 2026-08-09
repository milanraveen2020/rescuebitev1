/**
 * View models for the Cashier PWA. Server shapes come from @rescuebite/types;
 * these are the adapted shapes the counter UI renders. All money is an integer
 * in minor units per the Mystery Box money convention — never floats.
 *
 * The session itself is a server `Listing` (see features/sessions), so it has no
 * view model here — only the order shapes the counter screens need.
 */

/** Session lifecycle as the counter presents it (derived from the listing). */
export type SessionStatus =
  'draft' | 'active' | 'sold_out' | 'time_ended' | 'stopped' | 'completed';

export type PaymentStatus = 'paid' | 'pending' | 'refunded';

/**
 * A unique pickup code is assigned when the customer orders. `issued` means the
 * code is live and unused; `used` means it has been redeemed at handover.
 */
export type QrState = 'issued' | 'used';

/** Only two order statuses are surfaced: an order is Ready until it's Completed. */
export type OrderStatus = 'ready' | 'completed';

export interface Order {
  id: string;
  referenceNumber: string;
  sessionId: string;
  customerName: string;
  customerPhone: string;
  packageId: string;
  /** Listing title, denormalized for display. */
  packageName: string;
  quantity: number;
  /** Integer minor units. */
  unitPrice: number;
  /** Integer minor units. */
  totalPaid: number;
  paymentStatus: PaymentStatus;
  /** Pickup code, held for code -> order lookup. Never rendered. */
  qrToken: string;
  qrState: QrState;
  orderStatus: OrderStatus;
  purchasedAt: string;
  /** Set once the code has been validated (still Ready until completed). */
  verifiedAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  manualOverride: boolean;
  overrideReason: string | null;
}
