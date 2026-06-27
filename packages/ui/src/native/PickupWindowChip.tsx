import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface PickupWindowChipProps {
  start: string;
  end: string;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

export function PickupWindowChip({ start, end }: PickupWindowChipProps) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>
        {dayLabel(startDate)} · {fmtTime(startDate)}–{fmtTime(endDate)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand[50],
    borderRadius: radii.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  text: { fontSize: typography.fontSize.xs, fontWeight: '500', color: colors.brand[800] },
});
