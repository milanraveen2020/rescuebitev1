import { z } from 'zod';
import { CurrencySchema, MinorUnitsSchema } from './primitives.js';

/**
 * Payment + Stripe Connect contracts. Amounts are integer minor units and are
 * always recomputed server-side from the listing price — never trusted from the client.
 */

/** Returned when a checkout PaymentIntent is created for an order. */
export const CheckoutSessionSchema = z.object({
  paymentIntentId: z.string(),
  clientSecret: z.string(),
  amount: MinorUnitsSchema,
  /** Platform commission taken from the amount (application fee). */
  applicationFee: MinorUnitsSchema,
  currency: CurrencySchema,
  publishableKey: z.string(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

/** Merchant Stripe Connect status, shown in the Payouts section. */
export const ConnectStatusSchema = z.object({
  stripeAccountId: z.string().nullable(),
  connected: z.boolean(),
  payoutsEnabled: z.boolean(),
  detailsSubmitted: z.boolean(),
});
export type ConnectStatus = z.infer<typeof ConnectStatusSchema>;

/** A Stripe Connect onboarding (or refresh) link the merchant is redirected to. */
export const OnboardingLinkSchema = z.object({
  url: z.string().url(),
});
export type OnboardingLink = z.infer<typeof OnboardingLinkSchema>;
