import { describe, expect, it } from 'vitest';
import { ListingSchema } from './entities';
import { ApiErrorResponseSchema } from './result';

const validListing = {
  id: '11111111-1111-1111-1111-111111111111',
  storeId: '22222222-2222-2222-2222-222222222222',
  title: 'Surprise Bag',
  description: null,
  category: 'BAKERY',
  originalPrice: 1500,
  price: 499,
  quantityTotal: 6,
  quantityRemaining: 4,
  pickupStart: '2026-01-01T10:00:00.000Z',
  pickupEnd: '2026-01-01T12:00:00.000Z',
  imageUrl: null,
  allergenInfo: null,
  status: 'ACTIVE',
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
} as const;

describe('ListingSchema', () => {
  it('accepts a well-formed listing', () => {
    expect(ListingSchema.safeParse(validListing).success).toBe(true);
  });

  it('rejects a price above the original price', () => {
    const result = ListingSchema.safeParse({ ...validListing, price: 2000 });
    expect(result.success).toBe(false);
  });

  it('rejects quantityRemaining greater than quantityTotal', () => {
    const result = ListingSchema.safeParse({ ...validListing, quantityRemaining: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects a pickup window that ends before it starts', () => {
    const result = ListingSchema.safeParse({
      ...validListing,
      pickupStart: '2026-01-01T12:00:00.000Z',
      pickupEnd: '2026-01-01T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('ApiErrorResponseSchema', () => {
  it('parses the canonical { error: { code, message } } envelope', () => {
    const parsed = ApiErrorResponseSchema.parse({
      error: { code: 'not_found', message: 'Nope' },
    });
    expect(parsed.error.code).toBe('not_found');
  });

  it('rejects an unknown error code', () => {
    const result = ApiErrorResponseSchema.safeParse({
      error: { code: 'banana', message: 'x' },
    });
    expect(result.success).toBe(false);
  });
});
