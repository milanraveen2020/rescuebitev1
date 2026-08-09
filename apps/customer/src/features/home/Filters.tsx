import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Apple,
  Coffee,
  Croissant,
  LayoutGrid,
  Package,
  ShoppingBasket,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { FoodCategorySchema, type FoodCategory, type ListingSort } from '@rescuebite/types';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useAppConfig } from '../../api/queries';

/**
 * Fallback only. The real list comes from the platform config so a category the
 * operator has switched off stops being offered — previously these pills were the
 * full enum, so disabling a category left a pill that returned an empty feed.
 */
const ALL_CATEGORIES = FoodCategorySchema.options;

const CATEGORY_ICON: Record<FoodCategory, LucideIcon> = {
  BAKERY: Croissant,
  GROCERY: ShoppingBasket,
  RESTAURANT: UtensilsCrossed,
  CAFE: Coffee,
  PRODUCE: Apple,
  OTHER: Package,
};

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

// --- Category (primary): filled green pills with icons -----------------------

export function CategoryChips({
  selected,
  onSelect,
}: {
  selected: FoodCategory | null;
  onSelect: (category: FoodCategory | null) => void;
}) {
  const { data: config } = useAppConfig();
  // An empty list from the server means "no restriction", matching the API.
  const categories =
    config && config.enabledCategories.length > 0 ? config.enabledCategories : ALL_CATEGORIES;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // flexGrow:0 keeps this horizontal row at its content height. Without it the
      // ScrollView stretches to fill spare vertical space (e.g. when the list is
      // empty) and the centered chips drift downward.
      style={styles.catScroll}
      contentContainerStyle={styles.catRow}
    >
      <CategoryChip
        active={selected === null}
        onPress={() => onSelect(null)}
        text="All"
        Icon={LayoutGrid}
      />
      {categories.map((category) => (
        <CategoryChip
          key={category}
          active={selected === category}
          onPress={() => onSelect(category)}
          text={label(category)}
          Icon={CATEGORY_ICON[category]}
        />
      ))}
    </ScrollView>
  );
}

function CategoryChip({
  active,
  onPress,
  text,
  Icon,
}: {
  active: boolean;
  onPress: () => void;
  text: string;
  Icon: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.catChip, active ? styles.catChipActive : styles.catChipIdle]}
    >
      <Icon size={16} color={active ? colors.neutral[0] : colors.neutral[500]} />
      <Text style={[styles.catText, active ? styles.catTextActive : styles.catTextIdle]}>
        {text}
      </Text>
    </Pressable>
  );
}

// --- Sort (secondary): a distinct bar with dark outlined chips ---------------

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
    <View style={styles.sortBar}>
      <Text style={styles.sortLabel}>Sort</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortRow}
      >
        {SORTS.map((sort) => {
          const active = selected === sort.value;
          return (
            <Pressable
              key={sort.value}
              onPress={() => onSelect(sort.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.sortChip, active ? styles.sortChipActive : styles.sortChipIdle]}
            >
              <Text style={[styles.sortText, active ? styles.sortTextActive : styles.sortTextIdle]}>
                {sort.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Category row — flexGrow:0 so the horizontal scroller doesn't stretch into
  // spare vertical space; flexShrink:0 + an explicit height (40 chip + 8+8
  // padding) so the ScrollView can't be squeezed to 0 height when a sibling
  // overflows the column (which hid the row during the loading state).
  catScroll: { flexGrow: 0, flexShrink: 0, height: 56 },
  catRow: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
  },
  catChipActive: { backgroundColor: colors.brand[700] },
  catChipIdle: { backgroundColor: colors.surface.card },
  catText: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  catTextActive: { color: colors.neutral[0] },
  catTextIdle: { color: colors.neutral[700] },

  // Sort bar — visually separated from the category pills above
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: 'transparent',
  },
  sortLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  sortScroll: { flexGrow: 0 },
  sortRow: { gap: spacing[2], alignItems: 'center' },
  sortChip: {
    height: 32,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: colors.neutral[900], borderColor: colors.neutral[900] },
  sortChipIdle: { backgroundColor: 'transparent', borderColor: colors.neutral[300] },
  sortText: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  sortTextActive: { color: colors.neutral[0] },
  sortTextIdle: { color: colors.neutral[600] },
});
