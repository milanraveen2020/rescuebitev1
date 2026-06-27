import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
          <Stack.Screen name="checkout" />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
