import Stripe from 'stripe';
import type { Provider } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

/** DI token for the Stripe client (null when no secret key is configured). */
export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export type StripeClient = Stripe | null;

export const stripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): StripeClient => {
    const key = config.stripeSecretKey;
    return key ? new Stripe(key) : null;
  },
};
