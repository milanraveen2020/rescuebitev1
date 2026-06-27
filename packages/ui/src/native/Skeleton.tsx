import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { colors } from '../tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}

/** Gentle opacity pulse placeholder for loading states. */
export function Skeleton({ width = '100%', height = 16, radius = 8 }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius: radius, backgroundColor: colors.neutral[200], opacity }}
    />
  );
}
