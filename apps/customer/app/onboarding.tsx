import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Leaf, MapPin, ShoppingBag, type LucideIcon } from 'lucide-react-native';
import { Button } from '@rescuebite/ui/native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { Screen } from '../src/components/Screen';
import { completeOnboarding } from '../src/lib/onboarding';
import { requestLocationPermission } from '../src/lib/location';

const { width } = Dimensions.get('window');

const SLIDES: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: ShoppingBag,
    title: 'Rescue great food',
    body: 'Grab surprise bags of surplus food from local shops at a big discount.',
  },
  {
    Icon: MapPin,
    title: 'Discover nearby',
    body: 'See what’s available around you, sorted by distance, price, or ending soon.',
  },
  {
    Icon: Leaf,
    title: 'Fight food waste',
    body: 'Every bag you rescue helps your neighbourhood waste a little less.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  async function finish() {
    await requestLocationPermission().catch(() => false);
    await completeOnboarding();
    router.replace('/');
  }

  function next() {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      void finish();
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <slide.Icon size={64} color={colors.brand[600]} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={index === SLIDES.length - 1 ? 'Enable location & start' : 'Next'}
          onPress={next}
          block
        />
        <Button label="Skip" variant="ghost" onPress={() => void finish()} block />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.brand[700],
    textAlign: 'center',
  },
  body: { fontSize: typography.fontSize.lg, color: colors.neutral[600], textAlign: 'center' },
  footer: { padding: spacing[5], gap: spacing[3] },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neutral[300] },
  dotActive: { backgroundColor: colors.brand[600], width: 20 },
});
