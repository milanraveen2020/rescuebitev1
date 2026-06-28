import { Stack } from 'expo-router';
import { View } from 'react-native';
import { EmptyState } from '@rescuebite/ui/native';
import { Screen } from '../src/components/Screen';

/**
 * Notification inbox. The notifications API arrives in a later prompt; until then
 * this renders a polished empty state. It's wired to drop in a list + read state
 * once `GET /notifications` exists.
 */
export default function NotificationsScreen() {
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications' }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          title="You’re all caught up"
          description="Reservation updates and pickup reminders will appear here."
        />
      </View>
    </Screen>
  );
}
