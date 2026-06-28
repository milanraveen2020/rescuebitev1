import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Skeleton } from '@rescuebite/ui/native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';

/** Skeleton placeholder list shown while listings load. */
export function ListingsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} style={styles.skelCard}>
          <Skeleton height={140} radius={12} />
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={14} />
        </Card>
      ))}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <EmptyState
        title="Something went wrong"
        description={message ?? 'Please try again in a moment.'}
        action={onRetry ? <Button label="Retry" onPress={onRetry} variant="secondary" /> : undefined}
      />
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
  list: { gap: spacing[4], padding: spacing[4] },
  skelCard: { gap: spacing[2] },
  center: { flex: 1, justifyContent: 'center' },
  formError: { backgroundColor: '#fef3f2', borderRadius: 10, padding: spacing[3] },
  formErrorText: { color: colors.semantic.error, fontSize: typography.fontSize.sm },
});
