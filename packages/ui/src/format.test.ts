import { describe, expect, it } from 'vitest';
import { discountPercent, formatPrice } from './format';

describe('formatPrice', () => {
  it('formats minor units with the currency symbol', () => {
    expect(formatPrice(499, 'EUR')).toBe('€4.99');
    expect(formatPrice(699, 'LKR')).toBe('Rs 6.99');
    expect(formatPrice(1000, 'INR')).toBe('₹10.00');
  });

  it('falls back to the code for unknown currencies', () => {
    expect(formatPrice(500, 'AUD')).toBe('AUD 5.00');
  });
});

describe('discountPercent', () => {
  it('computes a whole-number discount', () => {
    expect(discountPercent(2000, 500)).toBe(75);
    expect(discountPercent(1500, 499)).toBe(67);
  });

  it('returns 0 when there is no discount or inputs are invalid', () => {
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, 1200)).toBe(0);
    expect(discountPercent(0, 500)).toBe(0);
  });
});
