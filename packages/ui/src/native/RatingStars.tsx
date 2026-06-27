import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../tokens';

export interface RatingStarsProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}

export function RatingStars({ value, onChange, size = 18 }: RatingStarsProps) {
  const interactive = typeof onChange === 'function';
  const rounded = Math.round(value);
  return (
    <View style={styles.row} accessibilityLabel={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const star_ = (
          <Text style={{ fontSize: size, color: star <= rounded ? colors.accent[500] : colors.neutral[300] }}>
            {star <= rounded ? '★' : '☆'}
          </Text>
        );
        return interactive ? (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} stars`}
            hitSlop={8}
            onPress={() => onChange?.(star)}
          >
            {star_}
          </Pressable>
        ) : (
          <View key={star}>{star_}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
