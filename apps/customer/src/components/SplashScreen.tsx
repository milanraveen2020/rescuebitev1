import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '@rescuebite/ui/tokens';
import { MysteryBoxSplashLogo } from './MysteryBoxSplashLogo';

/**
 * JS-rendered splash shown while the app boots. Distinct from the native
 * launch screen (configured via app.json `splash`, which needs a rasterized
 * image and an EAS rebuild to change) — this overlay renders instantly on
 * every Metro reload and needs no rebuild.
 */
export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        onFinish,
      );
    }, 1100);
    return () => clearTimeout(timer);
  }, [opacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <MysteryBoxSplashLogo width={220} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: colors.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
