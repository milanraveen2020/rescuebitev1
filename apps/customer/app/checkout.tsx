import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { useAuth } from '../src/auth/AuthContext';
import { Button } from '../src/components/ui';

/**
 * Gated checkout. Guests are allowed to browse, but reserving/paying requires an
 * account — unauthenticated users are redirected to log in.
 */
export default function CheckoutScreen() {
  const { status, isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated' || !isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.brand[500]} />
        <Text style={styles.note}>Checking your session…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reserve your bag</Text>
        <Text style={styles.body}>
          Signed in as {user?.email}. Payment and pickup details will live here.
        </Text>
        <Button label="Back to browsing" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  content: { flex: 1, padding: spacing[5], gap: spacing[4], justifyContent: 'center' },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.neutral[900] },
  body: { fontSize: typography.fontSize.base, color: colors.neutral[600] },
  note: { color: colors.neutral[500], fontSize: typography.fontSize.sm },
});
