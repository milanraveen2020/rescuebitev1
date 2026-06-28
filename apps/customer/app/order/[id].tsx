import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Button, Card, PickupWindowChip, RatingStars, useToast } from '@rescuebite/ui/native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useCancelOrder, useOrder, useReviewOrder } from '../../src/api/queries';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { addPickupToCalendar } from '../../src/lib/calendar';
import { pickupWindowState, useCountdown } from '../../src/lib/time';

const STATUS_TONE = {
  RESERVED: 'accent',
  PAID: 'brand',
  COLLECTED: 'brand',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
  NO_SHOW: 'danger',
} as const;

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancel = useCancelOrder();
  const review = useReviewOrder();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const countdown = useCountdown(order?.listing.pickupStart ?? new Date().toISOString());

  if (isLoading) return <Screen><ListingsSkeleton count={1} /></Screen>;
  if (isError || !order) {
    return <Screen><ErrorView message="We couldn’t load this order." onRetry={() => void refetch()} /></Screen>;
  }

  const showCode = order.status === 'RESERVED' || order.status === 'PAID';
  const windowState = pickupWindowState(order.listing.pickupStart, order.listing.pickupEnd);
  const canCancel = order.status === 'RESERVED' || order.status === 'PAID';
  const canReview = order.status === 'COLLECTED' && order.review === null;

  async function onAddToCalendar() {
    if (!order) return;
    const ok = await addPickupToCalendar({
      title: `Pick up: ${order.listing.title}`,
      start: order.listing.pickupStart,
      end: order.listing.pickupEnd,
      location: order.store.address,
      notes: `Pickup code: ${order.pickupCode}`,
    });
    toast(ok ? 'Added to your calendar' : 'Calendar permission denied', ok ? 'success' : 'error');
  }

  async function onCancel() {
    await cancel.mutateAsync(id).then(() => toast('Reservation cancelled', 'neutral')).catch(() => toast('Could not cancel', 'error'));
  }

  async function onSubmitReview() {
    if (rating < 1) {
      toast('Pick a rating first', 'error');
      return;
    }
    await review
      .mutateAsync({ id, input: { rating, ...(comment ? { comment } : {}) } })
      .then(() => toast('Thanks for the review!', 'success'))
      .catch(() => toast('Could not submit review', 'error'));
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Your order' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <Badge label={order.status} tone={STATUS_TONE[order.status]} />
          {showCode ? <Text style={styles.countdown}>Pickup {windowState === 'open' ? 'open now' : countdown}</Text> : null}
        </View>

        {showCode ? (
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>Show this code at pickup</Text>
            <Text style={styles.code}>{order.pickupCode}</Text>
            <PickupWindowChip start={order.listing.pickupStart} end={order.listing.pickupEnd} />
            <Button label="Add to calendar" variant="secondary" onPress={() => void onAddToCalendar()} block />
          </Card>
        ) : null}

        <Card style={styles.infoCard}>
          <Text style={styles.store}>{order.store.name}</Text>
          <Text style={styles.title}>{order.listing.title}</Text>
          <Text style={styles.meta}>Quantity {order.quantity} · {order.store.address}</Text>
        </Card>

        {canReview ? (
          <Card style={styles.reviewCard}>
            <Text style={styles.title}>Rate your bag</Text>
            <RatingStars value={rating} onChange={setRating} size={32} />
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment (optional)"
              placeholderTextColor={colors.neutral[400]}
              style={styles.commentInput}
              multiline
            />
            <Button label="Submit review" onPress={() => void onSubmitReview()} loading={review.isPending} block />
          </Card>
        ) : null}

        {order.review ? (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Your review</Text>
            <RatingStars value={order.review.rating} />
            {order.review.comment ? <Text style={styles.meta}>{order.review.comment}</Text> : null}
          </Card>
        ) : null}

        {canCancel ? (
          <Button label="Cancel reservation" variant="ghost" onPress={() => void onCancel()} loading={cancel.isPending} block />
        ) : null}
        <Button label="Back to discover" variant="ghost" onPress={() => router.replace('/')} block />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[3] },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countdown: { fontSize: typography.fontSize.sm, color: colors.neutral[600], fontWeight: '500' },
  codeCard: { alignItems: 'center', gap: spacing[3], backgroundColor: colors.brand[50] },
  codeLabel: { fontSize: typography.fontSize.sm, color: colors.brand[800] },
  code: { fontSize: 44, fontWeight: '800', letterSpacing: 6, color: colors.brand[800] },
  infoCard: { gap: spacing[1] },
  reviewCard: { gap: spacing[3] },
  store: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  title: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.neutral[900] },
  meta: { fontSize: typography.fontSize.sm, color: colors.neutral[600] },
  sectionTitle: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.neutral[900] },
  commentInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radii.md,
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.neutral[900],
    textAlignVertical: 'top',
  },
});
