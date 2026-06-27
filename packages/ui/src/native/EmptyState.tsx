import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../tokens';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[8] },
  title: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.neutral[900], textAlign: 'center' },
  description: { fontSize: typography.fontSize.sm, color: colors.neutral[500], textAlign: 'center' },
  action: { marginTop: spacing[2] },
});
