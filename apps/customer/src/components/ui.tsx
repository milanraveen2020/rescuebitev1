import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonGhost,
        (pressed || isDisabled) && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.neutral[0] : colors.brand[600]} />
      ) : (
        <Text style={[styles.buttonLabel, variant === 'ghost' && styles.buttonLabelGhost]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  errorText,
  ...inputProps
}: { label: string; errorText?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errorText ? styles.inputError : null]}
        placeholderTextColor={colors.neutral[400]}
        accessibilityLabel={label}
        {...inputProps}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert">
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  buttonPrimary: { backgroundColor: colors.brand[500] },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonPressed: { opacity: 0.7 },
  buttonLabel: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  buttonLabelGhost: { color: colors.brand[600] },
  field: { gap: spacing[1] },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[0],
  },
  inputError: { borderColor: colors.semantic.error },
  errorText: { color: colors.semantic.error, fontSize: typography.fontSize.xs },
  formError: {
    backgroundColor: '#fef2f2',
    borderRadius: radii.md,
    padding: spacing[3],
  },
  formErrorText: { color: colors.semantic.error, fontSize: typography.fontSize.sm },
});
