import { createElement, type ReactElement, type ReactNode } from 'react';
import type * as StripeReactNative from '@stripe/stripe-react-native';
import { isExpoGo } from './runtime';

/**
 * Stripe's native module isn't present in Expo Go's binary — merely
 * `require`-ing '@stripe/stripe-react-native' throws immediately (it calls
 * `TurboModuleRegistry.getEnforcing` at import time), crashing the whole app
 * before any `isExpoGo` check can run. So the module is only ever required
 * here, lazily, and only when we already know we're not in Expo Go. The type
 * import above is erased at compile time and has no runtime cost.
 */
type StripeModule = typeof StripeReactNative;

let cached: StripeModule | null = null;
function stripeModule(): StripeModule {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load to dodge Expo Go's missing native module
    cached = require('@stripe/stripe-react-native') as StripeModule;
  }
  return cached;
}

/** Renders the real StripeProvider outside Expo Go; passes children through inside it. */
export function StripeProviderSafe({
  children,
  publishableKey,
}: {
  children: ReactElement;
  publishableKey: string;
}): ReactNode {
  if (isExpoGo) return children;
  const { StripeProvider } = stripeModule();
  // StripeProvider's props type declares `children` as required, so createElement's
  // rest-args overload (which needs an optional `children`) doesn't typecheck here.
  // eslint-disable-next-line react/no-children-prop -- not JSX; createElement needs children in props to satisfy StripeProvider's required prop type
  return createElement(StripeProvider, { children, publishableKey, urlScheme: 'rescuebite' });
}

type StripeApi = ReturnType<typeof StripeReactNative.useStripe>;
type InitPaymentSheet = StripeApi['initPaymentSheet'];
type PresentPaymentSheet = StripeApi['presentPaymentSheet'];

/**
 * Same shape as `@stripe/stripe-react-native`'s `useStripe()` (just the two
 * methods checkout uses), but returns a stub in Expo Go that reports payments
 * as unavailable instead of throwing.
 */
export function useStripeSafe(): {
  initPaymentSheet: InitPaymentSheet;
  presentPaymentSheet: PresentPaymentSheet;
} {
  if (isExpoGo) {
    const unavailable = () =>
      Promise.resolve({
        error: { message: 'Payments need a dev build — not available in Expo Go.' },
      });
    return {
      initPaymentSheet: unavailable as unknown as InitPaymentSheet,
      presentPaymentSheet: unavailable as unknown as PresentPaymentSheet,
    };
  }
  const { initPaymentSheet, presentPaymentSheet } = stripeModule().useStripe();
  return { initPaymentSheet, presentPaymentSheet };
}
