import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@rescuebite/ui/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RescueBite</Text>
      <Text style={styles.subtitle}>Rescue delicious surplus food near you.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.neutral[0],
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.brand[700],
  },
  subtitle: {
    marginTop: spacing[2],
    fontSize: 16,
    color: colors.neutral[600],
    textAlign: 'center',
  },
});
