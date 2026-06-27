import { z } from 'zod';
import {
  FoodCategorySchema,
  ListingStatusSchema,
  NotificationTypeSchema,
  OrderStatusSchema,
  StoreStatusSchema,
  UserRoleSchema,
  UserStatusSchema,
} from './enums.js';
import {
  CurrencySchema,
  IdSchema,
  IsoDateTimeSchema,
  MinorUnitsSchema,
  RatingSchema,
} from './primitives.js';

/**
 * Core domain entities for RescueBite, expressed as Zod schemas so the same
 * definition validates the API boundary and drives static types across every app.
 * These mirror the Prisma models in apps/api and are the single source of truth —
 * do not redeclare or hand-write these shapes anywhere else. Dates are serialized
 * ISO-8601 strings (the JSON wire shape), not Date objects.
 */

export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  phone: z.string().min(1).nullable(),
  role: UserRoleSchema,
  name: z.string().min(1).max(120),
  avatarUrl: z.string().url().nullable(),
  status: UserStatusSchema,
  emailVerifiedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;

/** A user as exposed over the API — never includes passwordHash. */
export const PublicUserSchema = UserSchema;
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const StoreSchema = z.object({
  id: IdSchema,
  ownerId: IdSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
  category: FoodCategorySchema,
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  logoUrl: z.string().url().nullable(),
  coverUrl: z.string().url().nullable(),
  currency: CurrencySchema,
  stripeAccountId: z.string().nullable(),
  payoutsEnabled: z.boolean(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  status: StoreStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Store = z.infer<typeof StoreSchema>;

/** A "surprise bag": discounted surplus food offered for a pickup window. */
export const ListingSchema = z
  .object({
    id: IdSchema,
    storeId: IdSchema,
    title: z.string().min(1).max(120),
    description: z.string().max(1000).nullable(),
    category: FoodCategorySchema,
    originalPrice: MinorUnitsSchema,
    price: MinorUnitsSchema,
    quantityTotal: z.number().int().nonnegative(),
    quantityRemaining: z.number().int().nonnegative(),
    pickupStart: IsoDateTimeSchema,
    pickupEnd: IsoDateTimeSchema,
    imageUrl: z.string().url().nullable(),
    allergenInfo: z.string().max(500).nullable(),
    status: ListingStatusSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .refine((l) => l.price <= l.originalPrice, {
    message: 'price must not exceed originalPrice',
    path: ['price'],
  })
  .refine((l) => l.quantityRemaining <= l.quantityTotal, {
    message: 'quantityRemaining must not exceed quantityTotal',
    path: ['quantityRemaining'],
  })
  .refine((l) => new Date(l.pickupStart) < new Date(l.pickupEnd), {
    message: 'pickupStart must be before pickupEnd',
    path: ['pickupEnd'],
  });
export type Listing = z.infer<typeof ListingSchema>;

export const OrderSchema = z.object({
  id: IdSchema,
  customerId: IdSchema,
  listingId: IdSchema,
  storeId: IdSchema,
  quantity: z.number().int().min(1),
  unitPrice: MinorUnitsSchema,
  totalAmount: MinorUnitsSchema,
  currency: CurrencySchema,
  status: OrderStatusSchema,
  pickupCode: z.string().min(4).max(12),
  stripePaymentIntentId: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  collectedAt: IsoDateTimeSchema.nullable(),
  updatedAt: IsoDateTimeSchema,
});
export type Order = z.infer<typeof OrderSchema>;

export const ReviewSchema = z.object({
  id: IdSchema,
  orderId: IdSchema,
  customerId: IdSchema,
  storeId: IdSchema,
  rating: RatingSchema,
  comment: z.string().max(1000).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Review = z.infer<typeof ReviewSchema>;

/** Free-form, type-tagged payload attached to a notification. */
export const NotificationDataSchema = z.record(z.string(), z.unknown());
export type NotificationData = z.infer<typeof NotificationDataSchema>;

export const NotificationSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  type: NotificationTypeSchema,
  title: z.string().min(1),
  body: z.string(),
  data: NotificationDataSchema.nullable(),
  readAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const FavoriteSchema = z.object({
  userId: IdSchema,
  storeId: IdSchema,
  createdAt: IsoDateTimeSchema,
});
export type Favorite = z.infer<typeof FavoriteSchema>;

export const AuditLogSchema = z.object({
  id: IdSchema,
  actorId: IdSchema.nullable(),
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
