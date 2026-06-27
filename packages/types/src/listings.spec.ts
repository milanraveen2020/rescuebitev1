import { describe, expect, it } from 'vitest';
import { CreateListingSchema, NearbyQuerySchema, UpdateListingSchema } from './listings';

const base = {
  title: 'Surprise Bag',
  category: 'BAKERY',
  originalPrice: 1500,
  price: 499,
  quantityTotal: 6,
  pickupStart: '2026-01-01T10:00:00.000Z',
  pickupEnd: '2026-01-01T12:00:00.000Z',
};

describe('CreateListingSchema', () => {
  it('accepts a valid listing and defaults status to DRAFT', () => {
    const parsed = CreateListingSchema.parse(base);
    expect(parsed.status).toBe('DRAFT');
  });

  it('rejects a price above the original price', () => {
    expect(CreateListingSchema.safeParse({ ...base, price: 2000 }).success).toBe(false);
  });

  it('rejects a pickup window that ends before it starts', () => {
    const result = CreateListingSchema.safeParse({
      ...base,
      pickupStart: '2026-01-01T12:00:00.000Z',
      pickupEnd: '2026-01-01T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateListingSchema', () => {
  it('allows partial updates', () => {
    expect(UpdateListingSchema.safeParse({ quantityRemaining: 3 }).success).toBe(true);
  });

  it('still enforces price <= originalPrice when both are present', () => {
    expect(UpdateListingSchema.safeParse({ price: 900, originalPrice: 500 }).success).toBe(false);
  });
});

describe('NearbyQuerySchema', () => {
  it('coerces query-string params and applies defaults', () => {
    const parsed = NearbyQuerySchema.parse({ lat: '53.34', lng: '-6.26' });
    expect(parsed).toMatchObject({ lat: 53.34, lng: -6.26, radiusKm: 5, sort: 'distance', limit: 20 });
  });

  it('parses availableNow only from "true"/"false"', () => {
    expect(NearbyQuerySchema.parse({ lat: 0, lng: 0, availableNow: 'true' }).availableNow).toBe(true);
    expect(NearbyQuerySchema.parse({ lat: 0, lng: 0, availableNow: 'false' }).availableNow).toBe(
      false,
    );
  });

  it('rejects maxPrice < minPrice', () => {
    expect(
      NearbyQuerySchema.safeParse({ lat: 0, lng: 0, minPrice: 500, maxPrice: 100 }).success,
    ).toBe(false);
  });
});
