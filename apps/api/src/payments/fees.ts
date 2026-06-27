/**
 * Platform commission, taken as Stripe's `application_fee_amount` on each charge.
 * Pure and integer-only (minor units) so it's exact and easy to test.
 */
export function computePlatformFee(amountMinor: number, feeBps: number): number {
  if (amountMinor <= 0) return 0;
  const fee = Math.round((amountMinor * feeBps) / 10_000);
  // The fee can never meet or exceed the charge (Stripe rejects it, and the
  // merchant must receive something).
  return Math.min(fee, Math.max(0, amountMinor - 1));
}
