import { Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { Notification } from '@rescuebite/types';
import { Button, EmptyState } from '@rescuebite/ui/native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../src/api/queries';
import { useAuth } from '../src/auth/AuthContext';
import { Screen } from '../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../src/components/States';

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useNotifications(isAuthenticated);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  function onPressItem(item: Notification): void {
    if (!item.readAt) markRead.mutate(item.id);
    const orderId = typeof item.data?.orderId === 'string' ? item.data.orderId : null;
    const listingId = typeof item.data?.listingId === 'string' ? item.data.listingId : null;
    if (orderId) router.push(`/order/${orderId}`);
    else if (listingId) router.push(`/listing/${listingId}`);
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerRight: () =>
            hasUnread ? (
              <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
                <Text style={styles.markAll}>Mark all read</Text>
              </Pressable>
            ) : null,
        }}
      />

      {!isAuthenticated ? (
        <View style={styles.center}>
          <EmptyState
            title="Sign in for notifications"
            description="Order updates and pickup reminders appear here."
            action={<Button label="Log in" onPress={() => router.push('/login')} />}
          />
        </View>
      ) : isLoading ? (
        <ListingsSkeleton count={4} />
      ) : isError ? (
        <ErrorView onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="You’re all caught up"
            description="Reservation updates and pickup reminders will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brand[600]}
            />
          }
          onEndReached={() => {
            if (hasNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <Item item={item} onPress={() => onPressItem(item)} />}
        />
      )}
    </Screen>
  );
}

function Item({ item, onPress }: { item: Notification; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.item, !item.readAt && styles.itemUnread]}>
      {item.readAt ? <View style={styles.dotSpacer} /> : <View style={styles.dot} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  list: { padding: spacing[4], gap: spacing[2] },
  markAll: { color: colors.brand[700], fontSize: typography.fontSize.sm, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  itemUnread: { backgroundColor: colors.brand[50], borderColor: colors.brand[100] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand[600], marginTop: 6 },
  dotSpacer: { width: 8 },
  title: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.neutral[900] },
  body: { fontSize: typography.fontSize.sm, color: colors.neutral[600], marginTop: 2 },
  time: { fontSize: typography.fontSize.xs, color: colors.neutral[500], marginTop: spacing[1] },
});
