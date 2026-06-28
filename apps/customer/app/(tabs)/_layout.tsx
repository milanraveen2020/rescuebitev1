import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Compass, Heart, ReceiptText, User } from 'lucide-react-native';
import { colors, spacing } from '@rescuebite/ui/tokens';
import { hasCompletedOnboarding } from '../../src/lib/onboarding';

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
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <ReceiptText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
