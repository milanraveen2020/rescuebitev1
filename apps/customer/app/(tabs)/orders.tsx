import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OrderDetail } from '@rescuebite/types';
import { Badge, Button, EmptyState } from '@rescuebite/ui/native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useOrders } from '../../src/api/queries';
import { useAuth } from '../../src/auth/AuthContext';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { useCountdown } from '../../src/lib/time';

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useOrders();

  if (!isAuthenticated) {
    return (
      <Screen>
        <Header />
        <View style={styles.center}>
          <EmptyState
            title="Sign in to see your orders"
            description="Your reservations and pickup codes live here."
            action={<Button label="Log in" onPress={() => router.push('/login')} />}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header />
      {isLoading ? (
        <ListingsSkeleton count={3} />
      ) : isError || !data ? (
        <ErrorView onRetry={() => void refetch()} />
      ) : data.active.length === 0 && data.past.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No orders yet"
            description="Reserve a surprise bag and it’ll show up here."
            action={<Button label="Discover bags" onPress={() => router.replace('/')} />}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brand[600]}
            />
          }
        >
          {data.active.length > 0 ? (
            <Section title="Active">
              {data.active.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onPress={() => router.push(`/order/${order.id}`)}
                />
              ))}
            </Section>
          ) : null}
          {data.past.length > 0 ? (
            <Section title="Past">
              {data.past.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onPress={() => router.push(`/order/${order.id}`)}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.heading}>Orders</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: spacing[3] }}>{children}</View>
    </View>
  );
}

const STATUS_TONE = {
  RESERVED: 'accent',
  PAID: 'brand',
  COLLECTED: 'brand',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
  NO_SHOW: 'danger',
} as const;

function OrderRow({ order, onPress }: { order: OrderDetail; onPress: () => void }) {
  const active = order.status === 'RESERVED' || order.status === 'PAID';
  const countdown = useCountdown(order.listing.pickupStart);
  const canReview = order.status === 'COLLECTED' && order.review === null;

  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <Image source={order.listing.imageUrl ?? undefined} style={styles.thumb} contentFit="cover" />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.store} numberOfLines={1}>
            {order.store.name}
          </Text>
          <Badge label={order.status} tone={STATUS_TONE[order.status]} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {order.listing.title}
        </Text>
        {active ? (
          <Text style={styles.code}>
            Code {order.pickupCode} · pickup {countdown}
          </Text>
        ) : canReview ? (
          <Text style={styles.rateCta}>★ Rate your bag</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  heading: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.brand[700] },
  content: { padding: spacing[4], gap: spacing[5] },
  center: { flex: 1, justifyContent: 'center' },
  section: { gap: spacing[3] },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.neutral[900] },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  thumb: { width: 88, height: 88, backgroundColor: colors.neutral[100] },
  rowBody: { flex: 1, padding: spacing[3], gap: spacing[1], justifyContent: 'center' },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  store: { fontSize: typography.fontSize.sm, color: colors.neutral[500], flex: 1 },
  title: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.neutral[900] },
  code: { fontSize: typography.fontSize.sm, color: colors.brand[700], fontWeight: '600' },
  rateCta: { fontSize: typography.fontSize.sm, color: colors.accent[700], fontWeight: '600' },
});
