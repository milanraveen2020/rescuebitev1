import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { colors, spacing } from '@rescuebite/ui/tokens';
import { hasCompletedOnboarding } from '../../src/lib/onboarding';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function TabsLayout() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void hasCompletedOnboarding().then(setOnboarded);
  }, []);

  if (onboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.neutral[50] }}>
        <ActivityIndicator color={colors.brand[600]} />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[700],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: { paddingTop: spacing[1], height: 56 + spacing[3] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Discover', tabBarIcon: ({ focused }) => <TabIcon icon="🧭" focused={focused} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: ({ focused }) => <TabIcon icon="🧾" focused={focused} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Favorites', tabBarIcon: ({ focused }) => <TabIcon icon="❤️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
