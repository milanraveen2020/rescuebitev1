import {
  OrderDetailSchema,
  StoreOrdersSchema,
  StoreSchema,
  type MerchantOrder,
  type OrderDetail,
  type Store,
} from '@rescuebite/types';
import { apiRequest, jsonInit } from '@/lib/api-session';
import type { Order } from '@/lib/types';

/** The signed-in staff member's store. */
export async function getStore(): Promise<Store> {
  return StoreSchema.parse(await apiRequest('/merchant/store'));
}

/**
 * Orders for the store. The API buckets by pickup window (today / upcoming);
 * the cashier counter cares about one flat list.
 */
export async function getStoreOrders(storeId: string): Promise<MerchantOrder[]> {
  const parsed = StoreOrdersSchema.parse(await apiRequest(`/stores/${storeId}/orders`));
  return [...parsed.today, ...parsed.upcoming];
}

/**
 * Hand the bag over. The server validates the customer's pickup code and marks
 * the order collected atomically — a wrong code is a 400 and a re-used code is
 * a 409, so single-use is enforced server-side, never by this client.
 */
export async function collectOrder(orderId: string, pickupCode: string): Promise<OrderDetail> {
  return OrderDetailSchema.parse(
    await apiRequest(`/orders/${orderId}/collect`, jsonInit('POST', { pickupCode })),
  );
}

/**
 * Map a server order onto the cashier's view model.
 *
 * Notes on the mapping:
 * - Only PAID and COLLECTED reach the counter, per the two-status rule; the
 *   caller filters the rest out.
 * - `pickupCode` is deliberately NOT surfaced as the display reference. The
 *   customer presents it; showing it to staff would defeat the check. A short
 *   slice of the order id is used as the human reference instead.
 * - The API has no customer phone on this shape, so it is left blank.
 */
export function toCashierOrder(o: MerchantOrder): Order {
  const completed = o.status === 'COLLECTED';
  return {
    id: o.id,
    referenceNumber: `#${o.id.slice(0, 6).toUpperCase()}`,
    sessionId: o.listingId,
    customerName: o.customer.name,
    customerPhone: '',
    packageId: o.listingId,
    packageName: o.listing.title,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalPaid: o.totalAmount,
    paymentStatus: 'paid',
    // Held for code -> order lookup by the scanner. Never rendered: the customer
    // presents this code, and the server re-validates it on collect.
    qrToken: o.pickupCode,
    qrState: completed ? 'used' : 'issued',
    orderStatus: completed ? 'completed' : 'ready',
    purchasedAt: o.createdAt,
    verifiedAt: o.collectedAt,
    completedAt: o.collectedAt,
    completedBy: completed ? 'Staff' : null,
    manualOverride: false,
    overrideReason: null,
  };
}

/** Orders that belong on the counter screen (live + already handed over). */
export function isCounterOrder(o: MerchantOrder): boolean {
  return o.status === 'PAID' || o.status === 'COLLECTED';
}
