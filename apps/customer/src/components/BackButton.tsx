import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, radii } from '@rescuebite/ui/tokens';

/**
 * A static chevron-only back button, used as `headerLeft` everywhere so every
 * screen shares the same look — no cross-fading "Back" label sliding in from
 * the previous screen's title, which is what the default header back button does.
 */
export function BackButton({ variant = 'plain' }: { variant?: 'plain' | 'floating' }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={10}
      style={variant === 'floating' ? styles.floating : styles.plain}
    >
      <ChevronLeft
        size={variant === 'floating' ? 22 : 26}
        color={variant === 'floating' ? colors.neutral[900] : colors.brand[700]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plain: { width: 44, height: 44, marginLeft: -8, alignItems: 'center', justifyContent: 'center' },
  floating: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
