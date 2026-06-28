import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, useToast } from '@rescuebite/ui/native';
import { formatPrice } from '@rescuebite/ui';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { paymentsApi } from '../../src/api/endpoints';
import { useListing, useReserve } from '../../src/api/queries';
import { ApiError } from '../../src/api/request';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { isExpoGo } from '../../src/lib/runtime';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { data: listing, isLoading, isError, refetch } = useListing(id);
  const reserve = useReserve();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <Screen><ListingsSkeleton count={1} /></Screen>;
  if (isError || !listing) {
    return (
      <Screen>
        <ErrorView message="We couldn’t load this bag." onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const maxQty = Math.min(listing.quantityRemaining, 10);
  const total = listing.price * quantity;

  async function pay() {
    if (!listing) return;
    setBusy(true);
    try {
      const order = await reserve.mutateAsync({ listingId: listing.id, quantity });

      // Expo Go can't run Stripe — reserve so the order + pickup code are visible.
      if (isExpoGo) {
        toast('Reserved! Payment needs a dev build.', 'success');
        router.replace(`/order/${order.id}`);
        return;
      }

      const checkout = await paymentsApi.checkout(order.id);

      const init = await initPaymentSheet({
        merchantDisplayName: listing.store.name,
        paymentIntentClientSecret: checkout.clientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (init.error) throw new Error(init.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        // Cancelled or failed — the reservation hold will auto-release.
        toast(result.error.message ?? 'Payment cancelled', 'error');
        return;
      }
      toast('Payment successful 🎉', 'success');
      router.replace(`/order/${order.id}`);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not complete payment.';
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Checkout' }} />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.store}>{listing.store.name}</Text>
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.stepper}>
              <Stepper label="−" onPress={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} />
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Stepper label="+" onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} />
            </View>
          </View>

          <View style={styles.divider} />
          <SummaryRow label={`${formatPrice(listing.price, listing.currency)} × ${quantity}`} value={formatPrice(total, listing.currency)} />
          <SummaryRow label="Total" value={formatPrice(total, listing.currency)} emphasis />
        </Card>

        <Text style={styles.note}>
          {isExpoGo
            ? 'Payments are disabled in Expo Go — reserving creates your order so you can see the pickup code. Use a dev build for real Stripe checkout.'
            : 'You’ll pay securely with Stripe. Show your pickup code at the store during the pickup window.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label={isExpoGo ? 'Reserve' : `Reserve & pay ${formatPrice(total, listing.currency)}`}
          onPress={() => void pay()}
          loading={busy}
          block
        />
      </View>
    </Screen>
  );
}

function Stepper({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label === '+' ? 'Increase quantity' : 'Decrease quantity'} style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, emphasis && styles.summaryEmphasis]}>{label}</Text>
      <Text style={[styles.summaryValue, emphasis && styles.summaryEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing[4], gap: spacing[3] },
  card: { gap: spacing[3] },
  store: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.neutral[900] },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontSize: typography.fontSize.base, color: colors.neutral[700] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  qtyValue: { fontSize: typography.fontSize.lg, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.4 },
  stepText: { fontSize: 22, color: colors.brand[700], fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.neutral[200] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: typography.fontSize.base, color: colors.neutral[600] },
  summaryValue: { fontSize: typography.fontSize.base, color: colors.neutral[800] },
  summaryEmphasis: { fontWeight: '700', color: colors.neutral[900] },
  note: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  footer: { padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.neutral[200], backgroundColor: colors.neutral[0] },
});
