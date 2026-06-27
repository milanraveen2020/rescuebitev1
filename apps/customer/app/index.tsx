import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { useAuth } from '../src/auth/AuthContext';
import { Button } from '../src/components/ui';

/**
 * Browse-as-guest landing. Unauthenticated users can look around freely; the
 * primary action adapts to session state and checkout is gated downstream.
 */
export default function HomeScreen() {
  const { status, user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.brand[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>RescueBite</Text>
        <Text style={styles.tagline}>Rescue delicious surplus food near you.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Surprise Bag</Text>
        <Text style={styles.cardBody}>
          Browse magic bags from local shops. Reserve one and pick it up before it goes to waste.
        </Text>
      </View>

      <View style={styles.actions}>
        {isAuthenticated ? (
          <>
            <Text style={styles.greeting}>Welcome back, {user?.name}.</Text>
            <Button label="Reserve a bag" onPress={() => router.push('/checkout')} />
            <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
          </>
        ) : (
          <>
            <Text style={styles.guestNote}>You&apos;re browsing as a guest.</Text>
            <Button label="Reserve a bag" onPress={() => router.push('/checkout')} />
            <Link href="/login" asChild>
              <Button label="Log in" variant="ghost" onPress={() => router.push('/login')} />
            </Link>
            <Link href="/signup" asChild>
              <Button label="Create account" variant="ghost" onPress={() => router.push('/signup')} />
            </Link>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0], padding: spacing[5], gap: spacing[6] },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { gap: spacing[2], marginTop: spacing[6] },
  brand: { fontSize: typography.fontSize['4xl'], fontWeight: '700', color: colors.brand[700] },
  tagline: { fontSize: typography.fontSize.lg, color: colors.neutral[600] },
  card: {
    backgroundColor: colors.brand[50],
    borderRadius: 16,
    padding: spacing[5],
    gap: spacing[2],
  },
  cardTitle: { fontSize: typography.fontSize.xl, fontWeight: '600', color: colors.brand[800] },
  cardBody: { fontSize: typography.fontSize.base, color: colors.neutral[700] },
  actions: { gap: spacing[3], marginTop: 'auto' },
  greeting: { fontSize: typography.fontSize.base, color: colors.neutral[700] },
  guestNote: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
});
