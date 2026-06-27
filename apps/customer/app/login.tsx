import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginSchema } from '@rescuebite/types';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { Button, Field, FormError } from '../src/components/ui';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to reserve your surprise bags.</Text>

          <FormError message={error} />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Your password"
          />
          <Button label="Log in" onPress={() => void onSubmit()} loading={submitting} />
          <Button
            label="Create an account instead"
            variant="ghost"
            onPress={() => router.replace('/signup')}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing[5], gap: spacing[4], justifyContent: 'center' },
  title: { fontSize: typography.fontSize['3xl'], fontWeight: '700', color: colors.neutral[900] },
  subtitle: { fontSize: typography.fontSize.base, color: colors.neutral[600] },
});
