import { z } from 'zod';

/**
 * Enums mirror the Prisma schema in apps/api exactly (same SCREAMING_SNAKE values).
 * These Zod enums are the single source of truth for the API boundary; the TS
 * union types are inferred from them — never hand-write the unions.
 */

export const UserRoleSchema = z.enum(['CUSTOMER', 'MERCHANT_OWNER', 'MERCHANT_STAFF', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const StoreStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type StoreStatus = z.infer<typeof StoreStatusSchema>;

export const FoodCategorySchema = z.enum([
  'BAKERY',
  'GROCERY',
  'RESTAURANT',
  'CAFE',
  'PRODUCE',
  'OTHER',
]);
export type FoodCategory = z.infer<typeof FoodCategorySchema>;

export const ListingStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'SOLD_OUT', 'EXPIRED']);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export const OrderStatusSchema = z.enum([
  'RESERVED',
  'PAID',
  'COLLECTED',
  'CANCELLED',
  'REFUNDED',
  'NO_SHOW',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const NotificationTypeSchema = z.enum([
  'ORDER_RESERVED',
  'ORDER_PAID',
  'PICKUP_REMINDER',
  'ORDER_COLLECTED',
  'ORDER_CANCELLED',
  'STORE_APPROVED',
  'STORE_REJECTED',
  'NEW_LISTING',
  'REVIEW_REQUEST',
  'SYSTEM',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
