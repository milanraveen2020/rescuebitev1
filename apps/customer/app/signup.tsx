import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { RegisterCustomerSchema } from '@rescuebite/types';
import { Button, Input } from '@rescuebite/ui/native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { ApiError } from '../src/api/request';
import { useAuth } from '../src/auth/AuthContext';
import { Screen } from '../src/components/Screen';
import { FormError } from '../src/components/States';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = RegisterCustomerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(parsed.data);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Join RescueBite</Text>
          <Text style={styles.subtitle}>Save food, save money, every day.</Text>

          <FormError message={error} />
          <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password-new" placeholder="At least 8 characters" />
          <Button label="Create account" onPress={() => void onSubmit()} loading={submitting} block />
          <Button label="I already have an account" variant="ghost" onPress={() => router.replace('/login')} block />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing[5], gap: spacing[4], flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: typography.fontSize['3xl'], fontWeight: '700', color: colors.neutral[900] },
  subtitle: { fontSize: typography.fontSize.base, color: colors.neutral[600] },
});
