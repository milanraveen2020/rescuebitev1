import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { FoodCategorySchema, type FoodCategory, type ListingSort } from '@rescuebite/types';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';

const CATEGORIES = FoodCategorySchema.options;

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function CategoryChips({
  selected,
  onSelect,
}: {
  selected: FoodCategory | null;
  onSelect: (category: FoodCategory | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip active={selected === null} onPress={() => onSelect(null)} text="All" />
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          active={selected === category}
          onPress={() => onSelect(category)}
          text={label(category)}
        />
      ))}
    </ScrollView>
  );
}

const SORTS: { value: ListingSort; label: string }[] = [
  { value: 'distance', label: 'Nearest' },
  { value: 'price', label: 'Cheapest' },
  { value: 'ending_soon', label: 'Ending soon' },
];

export function SortChips({
  selected,
  onSelect,
}: {
  selected: ListingSort;
  onSelect: (sort: ListingSort) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {SORTS.map((sort) => (
        <Chip
          key={sort.value}
          active={selected === sort.value}
          onPress={() => onSelect(sort.value)}
          text={sort.label}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ active, onPress, text }: { active: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[1] },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing[3], paddingVertical: spacing[1], minHeight: 36, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand[600] },
  chipIdle: { backgroundColor: colors.neutral[100] },
  chipText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  chipTextActive: { color: colors.neutral[0] },
  chipTextIdle: { color: colors.neutral[700] },
});
