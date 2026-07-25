import Stripe from 'stripe';
import type { Provider } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

/** DI token for the Stripe client (null when no secret key is configured). */
export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export type StripeClient = Stripe | null;

/** The .env.example placeholder — never a real Stripe key. */
const PLACEHOLDER_SECRET_KEY = 'sk_test_xxx';

export const stripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): StripeClient => {
    const key = config.stripeSecretKey;
    return key && key !== PLACEHOLDER_SECRET_KEY ? new Stripe(key) : null;
  },
};
