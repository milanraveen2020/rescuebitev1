import { z } from 'zod';
import { FoodCategorySchema } from './enums.js';
import { OrderSchema, ReviewSchema } from './entities.js';
import { StoreSummarySchema } from './listings.js';
import { IdSchema, IsoDateTimeSchema, RatingSchema } from './primitives.js';

/**
 * Order lifecycle contracts: reserve/cancel/collect/review inputs and the
 * customer/merchant response shapes.
 */

// --- Inputs ----------------------------------------------------------------

export const CreateOrderSchema = z.object({
  listingId: IdSchema,
  quantity: z.number().int().min(1).max(10).default(1),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const CollectOrderSchema = z.object({
  pickupCode: z.string().min(4).max(12),
});
export type CollectOrderInput = z.infer<typeof CollectOrderSchema>;

export const CreateReviewSchema = z.object({
  rating: RatingSchema,
  comment: z.string().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

// --- Embedded summaries ----------------------------------------------------

export const OrderListingSummarySchema = z.object({
  id: IdSchema,
  title: z.string(),
  imageUrl: z.string().url().nullable(),
  category: FoodCategorySchema,
  pickupStart: IsoDateTimeSchema,
  pickupEnd: IsoDateTimeSchema,
});
export type OrderListingSummary = z.infer<typeof OrderListingSummarySchema>;

export const OrderCustomerSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
});
export type OrderCustomerSummary = z.infer<typeof OrderCustomerSummarySchema>;

// --- Response shapes -------------------------------------------------------

/** Customer-facing order with its listing and store. */
export const OrderDetailSchema = OrderSchema.extend({
  listing: OrderListingSummarySchema,
  store: StoreSummarySchema,
  review: ReviewSchema.nullable(),
});
export type OrderDetail = z.infer<typeof OrderDetailSchema>;

/** Customer history split into active (RESERVED/PAID) and past (terminal). */
export const OrderHistorySchema = z.object({
  active: z.array(OrderDetailSchema),
  past: z.array(OrderDetailSchema),
});
export type OrderHistory = z.infer<typeof OrderHistorySchema>;

/** Merchant-facing order with the listing and customer. */
export const MerchantOrderSchema = OrderSchema.extend({
  listing: OrderListingSummarySchema,
  customer: OrderCustomerSummarySchema,
});
export type MerchantOrder = z.infer<typeof MerchantOrderSchema>;

/** Merchant store orders split into today's and upcoming pickup windows. */
export const StoreOrdersSchema = z.object({
  today: z.array(MerchantOrderSchema),
  upcoming: z.array(MerchantOrderSchema),
});
export type StoreOrders = z.infer<typeof StoreOrdersSchema>;
