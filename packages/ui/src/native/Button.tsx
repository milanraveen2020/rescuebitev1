import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, motion, radii, spacing, typography } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  block,
  style,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, ...motion.spring }).start();

  const variantStyle = VARIANTS[variant];
  const labelColor = variant === 'secondary' || variant === 'ghost' ? colors.brand[700] : colors.neutral[0];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, block ? styles.block : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => spring(motion.pressScale)}
        onPressOut={() => spring(1)}
        style={[styles.base, SIZES[size], variantStyle, isDisabled ? styles.disabled : null, style]}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : (
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const VARIANTS: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.brand[600] },
  secondary: { backgroundColor: colors.brand[50] },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.semantic.error },
};

const SIZES: Record<Size, ViewStyle> = {
  sm: { minHeight: 44, paddingHorizontal: spacing[3] },
  md: { minHeight: 48, paddingHorizontal: spacing[5] },
  lg: { minHeight: 52, paddingHorizontal: spacing[6] },
};

const styles = StyleSheet.create({
  base: { borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.6 },
  label: { fontSize: typography.fontSize.base, fontWeight: '600' },
});
