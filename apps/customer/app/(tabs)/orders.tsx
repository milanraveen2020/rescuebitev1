import { useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, History, type LucideIcon } from 'lucide-react-native';
import type { OrderDetail } from '@rescuebite/types';
import { Badge, Button, EmptyState } from '@rescuebite/ui/native';
import { colors, elevation, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useOrders } from '../../src/api/queries';
import { useAuth } from '../../src/auth/AuthContext';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { useCountdown } from '../../src/lib/time';

type Tab = 'active' | 'past';

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useOrders();
  const [tab, setTab] = useState<Tab>('active');

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

  const orders = data ? (tab === 'active' ? data.active : data.past) : [];

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
        <>
          <TabBar
            active={tab}
            onChange={setTab}
            activeCount={data.active.length}
            pastCount={data.past.length}
          />
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
            {orders.length === 0 ? (
              <View style={styles.tabEmpty}>
                <EmptyState
                  title={tab === 'active' ? 'No active orders' : 'No past orders'}
                  description={
                    tab === 'active'
                      ? 'Reserve a surprise bag and it’ll show up here.'
                      : 'Completed and cancelled orders will show up here.'
                  }
                />
              </View>
            ) : (
              <View style={{ gap: spacing[3] }}>
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/order/${order.id}`)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </>
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

function TabBar({
  active,
  onChange,
  activeCount,
  pastCount,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  activeCount: number;
  pastCount: number;
}) {
  return (
    <View style={styles.tabBar}>
      <TabButton
        label="Active"
        count={activeCount}
        icon={Clock}
        selected={active === 'active'}
        onPress={() => onChange('active')}
      />
      <TabButton
        label="Past"
        count={pastCount}
        icon={History}
        selected={active === 'past'}
        onPress={() => onChange('past')}
      />
    </View>
  );
}

function TabButton({
  label,
  count,
  icon: Icon,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.tabBtn, selected ? styles.tabBtnActive : styles.tabBtnIdle]}
    >
      <Icon size={16} color={selected ? colors.neutral[0] : colors.neutral[500]} />
      <Text style={[styles.tabText, selected ? styles.tabTextActive : styles.tabTextIdle]}>
        {label} ({count})
      </Text>
    </Pressable>
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
  header: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3] },
  heading: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.brand[700] },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
    gap: spacing[5],
  },
  center: { flex: 1, justifyContent: 'center' },
  tabEmpty: { paddingTop: spacing[8] },
  tabBar: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radii.pill,
  },
  tabBtnActive: { backgroundColor: colors.brand[700] },
  tabBtnIdle: { backgroundColor: colors.surface.card },
  tabText: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  tabTextActive: { color: colors.neutral[0] },
  tabTextIdle: { color: colors.neutral[700] },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...elevation.sm,
  },
  thumb: { width: 88, height: 88, backgroundColor: colors.surface.sunken },
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
