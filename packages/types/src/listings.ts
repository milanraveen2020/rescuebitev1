import { z } from 'zod';
import { FoodCategorySchema, ListingStatusSchema } from './enums.js';
import { IdSchema, IsoDateTimeSchema, MinorUnitsSchema } from './primitives.js';

/**
 * Listing ("surprise bag") contracts: merchant write inputs, customer-facing
 * discovery queries, and the response shapes. Money is integer minor units.
 */

// --- Merchant write inputs -------------------------------------------------

const writableFields = {
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  category: FoodCategorySchema,
  originalPrice: MinorUnitsSchema,
  price: MinorUnitsSchema,
  quantityTotal: z.number().int().min(1).max(1000),
  pickupStart: IsoDateTimeSchema,
  pickupEnd: IsoDateTimeSchema,
  imageUrl: z.string().url().optional(),
  allergenInfo: z.string().max(500).optional(),
};

interface PricedWindow {
  price?: number;
  originalPrice?: number;
  pickupStart?: string;
  pickupEnd?: string;
}

/** Cross-field rules shared by create and update. */
function withListingRules<T extends z.ZodTypeAny>(schema: T): z.ZodEffects<T> {
  const refined = schema.superRefine((value, ctx) => {
    const v = value as PricedWindow;
    if (v.price !== undefined && v.originalPrice !== undefined && v.price > v.originalPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discounted price cannot exceed the original price',
        path: ['price'],
      });
    }
    if (
      v.pickupStart !== undefined &&
      v.pickupEnd !== undefined &&
      new Date(v.pickupStart) >= new Date(v.pickupEnd)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup start must be before pickup end',
        path: ['pickupEnd'],
      });
    }
  });
  return refined as z.ZodEffects<T>;
}

export const CreateListingSchema = withListingRules(
  z.object({
    ...writableFields,
    // Merchants create a listing as a draft or publish it immediately.
    status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
  }),
);
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = withListingRules(
  z
    .object({
      ...writableFields,
      quantityRemaining: z.number().int().min(0).max(1000),
      status: ListingStatusSchema,
    })
    .partial(),
);
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

// --- Discovery query -------------------------------------------------------

export const ListingSortSchema = z.enum(['distance', 'price', 'ending_soon']);
export type ListingSort = z.infer<typeof ListingSortSchema>;

/** Coerces raw query-string params; `availableNow` accepts only "true"/"false". */
export const NearbyQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(0.1).max(50).default(5),
    category: FoodCategorySchema.optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    availableNow: z
      .union([z.literal('true'), z.literal('false'), z.boolean()])
      .transform((v) => v === true || v === 'true')
      .optional(),
    sort: ListingSortSchema.default('distance'),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((q) => q.maxPrice === undefined || q.minPrice === undefined || q.maxPrice >= q.minPrice, {
    message: 'maxPrice must be greater than or equal to minPrice',
    path: ['maxPrice'],
  });
export type NearbyQuery = z.infer<typeof NearbyQuerySchema>;

// --- Response shapes -------------------------------------------------------

export const StoreSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  category: FoodCategorySchema,
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  logoUrl: z.string().url().nullable(),
  rating: z.number(),
  reviewCount: z.number().int(),
});
export type StoreSummary = z.infer<typeof StoreSummarySchema>;

const listingResponseFields = {
  id: IdSchema,
  storeId: IdSchema,
  title: z.string(),
  description: z.string().nullable(),
  category: FoodCategorySchema,
  originalPrice: MinorUnitsSchema,
  price: MinorUnitsSchema,
  currency: z.string(),
  quantityTotal: z.number().int(),
  quantityRemaining: z.number().int(),
  pickupStart: IsoDateTimeSchema,
  pickupEnd: IsoDateTimeSchema,
  imageUrl: z.string().url().nullable(),
  allergenInfo: z.string().nullable(),
  status: ListingStatusSchema,
  /** Implied discount as a whole-number percentage (0–100). */
  discountPercent: z.number().int().min(0).max(100),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
};

/** A merchant's own listing (full record). */
export const ListingSchema = z.object(listingResponseFields);
export type Listing = z.infer<typeof ListingSchema>;

/** Customer-facing detail: listing + its store. */
export const ListingDetailSchema = z.object({
  ...listingResponseFields,
  store: StoreSummarySchema,
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

/** A discovery result: listing + store + distance from the query point. */
export const NearbyListingSchema = z.object({
  ...listingResponseFields,
  distanceKm: z.number(),
  store: StoreSummarySchema,
});
export type NearbyListing = z.infer<typeof NearbyListingSchema>;

export const NearbyListingPageSchema = z.object({
  items: z.array(NearbyListingSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type NearbyListingPage = z.infer<typeof NearbyListingPageSchema>;

// --- Image upload ----------------------------------------------------------

export const UploadRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
export type UploadRequestInput = z.infer<typeof UploadRequestSchema>;

export const UploadTicketSchema = z.object({
  /** PUT the file bytes here with the given content-type. */
  uploadUrl: z.string().url(),
  /** Public URL to persist on the listing once the upload succeeds. */
  fileUrl: z.string().url(),
  method: z.literal('PUT'),
  expiresIn: z.number().int().positive(),
});
export type UploadTicket = z.infer<typeof UploadTicketSchema>;
