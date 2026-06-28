import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  BellRing,
  ChevronRight,
  CreditCard,
  Heart,
  Pencil,
  type LucideIcon,
} from 'lucide-react-native';
import { Avatar, Badge, Button, Card, EmptyState, useToast } from '@rescuebite/ui/native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { useUnreadCount } from '../../src/api/queries';
import { useAuth } from '../../src/auth/AuthContext';
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { Screen } from '../../src/components/Screen';

export default function ProfileScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, signOut } = useAuth();
  const { ids } = useFavorites();
  const { data: unread } = useUnreadCount(isAuthenticated);

  if (!isAuthenticated || !user) {
    return (
      <Screen>
        <View style={styles.center}>
          <EmptyState
            title="Welcome to RescueBite"
            description="Sign in to reserve bags, track orders, and save favorites."
            action={
              <View style={styles.authButtons}>
                <Button label="Log in" onPress={() => router.push('/login')} />
                <Button
                  label="Create account"
                  variant="secondary"
                  onPress={() => router.push('/signup')}
                />
              </View>
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Avatar name={user.name} uri={user.avatarUrl} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          {user.emailVerifiedAt ? (
            <Badge label="Verified" tone="brand" />
          ) : (
            <Badge label="Unverified" tone="accent" />
          )}
        </View>

        <Card style={styles.menu}>
          <Row
            label="Notifications"
            icon={Bell}
            badge={unread && unread.unread > 0 ? unread.unread : undefined}
            onPress={() => router.push('/notifications')}
          />
          <Row
            label="Notification settings"
            icon={BellRing}
            onPress={() => router.push('/notification-settings')}
          />
          <Row
            label={`Favorites (${ids.length})`}
            icon={Heart}
            onPress={() => router.push('/favorites')}
          />
          <Row
            label="Edit profile"
            icon={Pencil}
            onPress={() => toast('Profile editing is coming soon', 'neutral')}
          />
          <Row
            label="Payment methods"
            icon={CreditCard}
            onPress={() => toast('Manage cards at checkout via Stripe', 'neutral')}
            last
          />
        </Card>

        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} block />
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  icon: Icon,
  onPress,
  last,
  badge,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  last?: boolean;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, !last && styles.rowBorder]}
    >
      <Icon size={20} color={colors.neutral[600]} />
      <Text style={styles.rowLabel}>{label}</Text>
      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={20} color={colors.neutral[400]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[4] },
  center: { flex: 1, justifyContent: 'center' },
  authButtons: { gap: spacing[2], alignSelf: 'stretch', paddingHorizontal: spacing[4] },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  name: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.neutral[900] },
  email: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  menu: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  rowLabel: { flex: 1, fontSize: typography.fontSize.base, color: colors.neutral[800] },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.neutral[0], fontSize: typography.fontSize.xs, fontWeight: '700' },
});
