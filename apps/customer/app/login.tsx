import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginSchema } from '@rescuebite/types';
import { Button, Input } from '@rescuebite/ui/native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { ApiError } from '../src/api/request';
import { useAuth } from '../src/auth/AuthContext';
import { FormError } from '../src/components/States';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(parsed.data);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Spacer pushes form to the bottom */}
        <View style={styles.flex} />

        <View style={[styles.content, { paddingBottom: Math.max(bottom, spacing[6]) }]}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to reserve your surprise bags.</Text>

          <FormError message={error} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Your password"
          />
          <Button label="Log in" onPress={() => void onSubmit()} loading={submitting} block />
          <Button
            label="Create an account instead"
            variant="ghost"
            onPress={() => router.replace('/signup')}
            block
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  handleWrap: { alignItems: 'center', paddingTop: spacing[5], paddingBottom: spacing[3] },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[300],
  },
  content: { paddingHorizontal: spacing[5], gap: spacing[4] },
  title: { fontSize: typography.fontSize['3xl'], fontWeight: '700', color: colors.neutral[900] },
  subtitle: { fontSize: typography.fontSize.base, color: colors.neutral[600] },
});
