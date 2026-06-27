import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

type Tone = 'neutral' | 'brand' | 'accent' | 'danger';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutral[100], fg: colors.neutral[700] },
  brand: { bg: colors.brand[100], fg: colors.brand[800] },
  accent: { bg: colors.accent[100], fg: colors.accent[700] },
  danger: { bg: '#fef3f2', fg: colors.semantic.error },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  text: { fontSize: typography.fontSize.xs, fontWeight: '500' },
});
