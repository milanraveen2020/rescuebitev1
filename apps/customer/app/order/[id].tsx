import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import {
  Badge,
  Button,
  Card,
  PickupWindowChip,
  RatingStars,
  useToast,
} from '@rescuebite/ui/native';
import { formatPrice } from '@rescuebite/ui';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useCancelOrder, useOrder, useReviewOrder } from '../../src/api/queries';
import { BackButton } from '../../src/components/BackButton';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { addPickupToCalendar, type AddToCalendarResult } from '../../src/lib/calendar';
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
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const review = useReviewOrder();
  const cancelOrder = useCancelOrder();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const countdown = useCountdown(order?.listing.pickupStart ?? new Date().toISOString());

  if (isLoading)
    return (
      <Screen>
        <ListingsSkeleton count={1} />
      </Screen>
    );
  if (isError || !order) {
    return (
      <Screen>
        <ErrorView message="We couldn’t load this order." onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const showCode = order.status === 'RESERVED' || order.status === 'PAID';
  const canCancel = showCode;
  const windowState = pickupWindowState(order.listing.pickupStart, order.listing.pickupEnd);
  const canReview = order.status === 'COLLECTED' && order.review === null;

  function onCancelOrder() {
    Alert.alert('Cancel this reservation?', 'Your pickup code will no longer be valid.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel reservation',
        style: 'destructive',
        onPress: () =>
          void cancelOrder
            .mutateAsync(id)
            .then(() => toast('Reservation cancelled', 'success'))
            .catch(() => toast('Could not cancel this order', 'error')),
      },
    ]);
  }

  async function onAddToCalendar() {
    if (!order) return;
    const result = await addPickupToCalendar({
      title: `Pick up: ${order.listing.title}`,
      start: order.listing.pickupStart,
      end: order.listing.pickupEnd,
      location: order.store.address,
      notes: `Pickup code: ${order.pickupCode}`,
    });
    const messages: Record<AddToCalendarResult, string> = {
      added: 'Added to your calendar',
      'permission-denied': 'Calendar permission denied',
      'no-calendar': 'No calendar app is set up on this device',
    };
    toast(messages[result], result === 'added' ? 'success' : 'error');
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
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.floatingBack, { top: insets.top + spacing[3] }]}>
        <BackButton variant="floating" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[9] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Your order</Text>
        <View style={styles.statusRow}>
          <Badge label={order.status} tone={STATUS_TONE[order.status]} />
          {showCode ? (
            <Text style={styles.countdown}>
              Pickup {windowState === 'open' ? 'open now' : countdown}
            </Text>
          ) : null}
        </View>

        {showCode ? (
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>Show this code at pickup</Text>
            <View style={styles.qrWrap}>
              <QRCode value={order.pickupCode} size={180} backgroundColor="white" />
            </View>
            <Text style={styles.codeHint}>Or read out the code below</Text>
            <Text style={styles.code}>{order.pickupCode}</Text>
            <PickupWindowChip
              start={order.listing.pickupStart}
              end={order.listing.pickupEnd}
              style={styles.pickupChip}
            />
            <Button
              label="Add to calendar"
              variant="secondary"
              onPress={() => void onAddToCalendar()}
              block
            />
          </Card>
        ) : null}

        <Card style={styles.infoCard}>
          <Text style={styles.store}>{order.store.name}</Text>
          <Text style={styles.title}>{order.listing.title}</Text>
          <Text style={styles.meta}>
            Quantity {order.quantity} · {order.store.address}
          </Text>
          <Text style={styles.meta}>Total {formatPrice(order.totalAmount, order.currency)}</Text>
        </Card>

        {canCancel ? (
          <Button
            label="Cancel reservation"
            variant="ghost"
            onPress={onCancelOrder}
            loading={cancelOrder.isPending}
            block
          />
        ) : null}

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
            <Button
              label="Submit review"
              onPress={() => void onSubmitReview()}
              loading={review.isPending}
              block
            />
          </Card>
        ) : null}

        {order.review ? (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Your review</Text>
            <RatingStars value={order.review.rating} />
            {order.review.comment ? <Text style={styles.meta}>{order.review.comment}</Text> : null}
          </Card>
        ) : null}

        <Button
          label="Back to discover"
          variant="ghost"
          onPress={() => router.replace('/')}
          block
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  floatingBack: { position: 'absolute', left: spacing[4], zIndex: 10 },
  content: { padding: spacing[4], gap: spacing[3] },
  heading: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.brand[700] },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countdown: { fontSize: typography.fontSize.sm, color: colors.neutral[600], fontWeight: '500' },
  codeCard: { alignItems: 'center', gap: spacing[3], backgroundColor: colors.brand[50] },
  codeLabel: { fontSize: typography.fontSize.sm, color: colors.brand[800] },
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  codeHint: { fontSize: 13, color: colors.neutral[500], textAlign: 'center', marginBottom: 2 },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 6, color: colors.brand[800] },
  pickupChip: { alignSelf: 'center' },
  infoCard: { gap: spacing[1] },
  reviewCard: { gap: spacing[3] },
  store: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  title: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.neutral[900] },
  meta: { fontSize: typography.fontSize.sm, color: colors.neutral[600] },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  commentInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.neutral[900],
    textAlignVertical: 'top',
  },
});
