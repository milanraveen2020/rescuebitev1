import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@rescuebite/ui/native';
import { STRIPE_PUBLISHABLE_KEY } from '../src/api/client';
import { AuthProvider } from '../src/auth/AuthContext';
import { FavoritesProvider } from '../src/favorites/FavoritesContext';
import { initMonitoring } from '../src/lib/monitoring';
import { isExpoGo } from '../src/lib/runtime';

// Initialize error monitoring once at startup (no-op unless a DSN is configured).
initMonitoring();

/** Stripe's native module isn't in Expo Go, so only mount its provider elsewhere. */
function PaymentsProvider({ children }: { children: ReactElement }) {
  if (isExpoGo) return children;
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="rescuebite">
      {children}
    </StripeProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaymentsProvider>
          <AuthProvider>
            <FavoritesProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="listing/[id]" options={{ animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="checkout/[id]" />
                  <Stack.Screen name="order/[id]" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="notification-settings" />
                  <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
                </Stack>
              </ToastProvider>
            </FavoritesProvider>
          </AuthProvider>
        </PaymentsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
