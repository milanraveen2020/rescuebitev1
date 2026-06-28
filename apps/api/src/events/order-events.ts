import type { OrderStatus } from '@prisma/client';

/**
 * Domain events emitted on each order/review transition. Notification handlers
 * (Prompt 12) subscribe to these; the orders module stays decoupled from them.
 */
export const OrderEvents = {
  Reserved: 'order.reserved',
  Paid: 'order.paid',
  Collected: 'order.collected',
  Cancelled: 'order.cancelled',
  NoShow: 'order.no_show',
  Refunded: 'order.refunded',
} as const;

export const ReviewEvents = {
  Created: 'review.created',
} as const;

export const StoreEvents = {
  Approved: 'store.approved',
  Rejected: 'store.rejected',
} as const;

export const ListingEvents = {
  /** A listing became visible to customers (created or updated into ACTIVE). */
  Published: 'listing.published',
} as const;

export interface StoreEventPayload {
  storeId: string;
  ownerId: string;
  reason?: string;
}

export interface ListingEventPayload {
  listingId: string;
  storeId: string;
}

export interface OrderEventPayload {
  orderId: string;
  customerId: string;
  storeId: string;
  listingId: string;
  status: OrderStatus;
  /** Why the transition happened, when relevant (e.g. 'expired', 'customer'). */
  reason?: string;
}

export interface ReviewEventPayload {
  reviewId: string;
  orderId: string;
  storeId: string;
  customerId: string;
  rating: number;
}
