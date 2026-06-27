import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface InputProps extends TextInputProps {
  label: string;
  errorText?: string;
}

export function Input({ label, errorText, style, ...props }: InputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.neutral[400]}
        style={[styles.input, errorText ? styles.inputError : null, style]}
        {...props}
      />
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[1] },
  label: { fontSize: typography.fontSize.sm, fontWeight: '500', color: colors.neutral[700] },
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
  error: { fontSize: typography.fontSize.xs, color: colors.semantic.error },
});
