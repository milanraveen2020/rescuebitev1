import { computePlatformFee } from './fees';

describe('computePlatformFee', () => {
  it('computes a percentage in basis points (1000 bps = 10%)', () => {
    expect(computePlatformFee(1000, 1000)).toBe(100);
    expect(computePlatformFee(599, 1000)).toBe(60); // rounds 59.9
    expect(computePlatformFee(2500, 1500)).toBe(375); // 15%
  });

  it('returns 0 for a zero fee or zero amount', () => {
    expect(computePlatformFee(1000, 0)).toBe(0);
    expect(computePlatformFee(0, 1000)).toBe(0);
  });

  it('never lets the fee meet or exceed the charge', () => {
    expect(computePlatformFee(100, 10000)).toBe(99);
    expect(computePlatformFee(1, 10000)).toBe(0);
  });
});
