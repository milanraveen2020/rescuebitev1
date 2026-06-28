import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NotificationPreferences } from '@rescuebite/types';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../src/api/queries';
import { Screen } from '../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../src/components/States';

interface Toggle {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

const CHANNELS: Toggle[] = [
  { key: 'push', label: 'Push notifications', description: 'Alerts on this device.' },
  { key: 'email', label: 'Email', description: 'Order confirmations and receipts.' },
];

const CATEGORIES: Toggle[] = [
  {
    key: 'orderUpdates',
    label: 'Order updates',
    description: 'Confirmations, collection, refunds.',
  },
  {
    key: 'pickupReminders',
    label: 'Pickup reminders',
    description: 'When your window is starting soon.',
  },
  {
    key: 'newBagsNearby',
    label: 'New bags near you',
    description: 'When favorited stores list bags.',
  },
];

export default function NotificationSettingsScreen() {
  const { data, isLoading, isError, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  function onToggle(key: keyof NotificationPreferences, value: boolean): void {
    update.mutate({ [key]: value });
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Notification settings' }} />
      {isLoading ? (
        <ListingsSkeleton count={2} />
      ) : isError || !data ? (
        <ErrorView onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="Channels" toggles={CHANNELS} prefs={data} onToggle={onToggle} />
          <Section
            title="What to notify me about"
            toggles={CATEGORIES}
            prefs={data}
            onToggle={onToggle}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

function Section({
  title,
  toggles,
  prefs,
  onToggle,
}: {
  title: string;
  toggles: Toggle[];
  prefs: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {toggles.map((t, i) => (
          <View key={t.key} style={[styles.row, i < toggles.length - 1 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t.label}</Text>
              <Text style={styles.description}>{t.description}</Text>
            </View>
            <Switch
              value={prefs[t.key]}
              onValueChange={(value) => onToggle(t.key, value)}
              trackColor={{ true: colors.brand[500], false: colors.neutral[200] }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[5] },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    minHeight: 64,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  label: { fontSize: typography.fontSize.base, fontWeight: '500', color: colors.neutral[900] },
  description: { fontSize: typography.fontSize.sm, color: colors.neutral[500], marginTop: 2 },
});
