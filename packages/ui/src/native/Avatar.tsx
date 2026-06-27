import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../tokens';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: radii.pill };
  if (uri) {
    return <Image source={{ uri }} accessibilityLabel={name} style={dimension} />;
  }
  const initials = name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View accessibilityLabel={name} style={[styles.fallback, dimension]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.brand[100], alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.brand[800], fontWeight: '600' },
});
