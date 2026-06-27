import { StyleSheet, Text, View } from 'react-native';
import { discountPercent, formatPrice } from '../format';
import { colors, radii, spacing, typography } from '../tokens';

export interface PriceTagProps {
  originalMinor: number;
  priceMinor: number;
  currency?: string;
}

export function PriceTag({ originalMinor, priceMinor, currency = 'EUR' }: PriceTagProps) {
  const percent = discountPercent(originalMinor, priceMinor);
  return (
    <View style={styles.row}>
      <Text style={styles.price}>{formatPrice(priceMinor, currency)}</Text>
      {percent > 0 ? (
        <>
          <Text style={styles.original}>{formatPrice(originalMinor, currency)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{percent}%</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] },
  price: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.neutral[900] },
  original: { fontSize: typography.fontSize.sm, color: colors.neutral[400], textDecorationLine: 'line-through' },
  badge: { backgroundColor: colors.accent[100], borderRadius: radii.pill, paddingHorizontal: spacing[1], paddingVertical: 2 },
  badgeText: { fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.accent[700] },
});
