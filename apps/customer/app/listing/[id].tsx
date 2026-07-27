import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Package, Sparkles, Wheat, type LucideIcon } from 'lucide-react-native';
import { Badge, Button, PickupWindowChip, PriceTag } from '@rescuebite/ui/native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { useListing } from '../../src/api/queries';
import { useAuth } from '../../src/auth/AuthContext';
import { BackButton } from '../../src/components/BackButton';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { data: listing, isLoading, isError, refetch } = useListing(id);

  const soldOut = listing ? listing.quantityRemaining <= 0 || listing.status !== 'ACTIVE' : false;

  function onReserve() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(`/checkout/${id}`);
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerLeft: () => <BackButton variant="floating" />,
        }}
      />
      {isLoading ? (
        <ListingsSkeleton count={1} />
      ) : isError || !listing ? (
        <ErrorView message="We couldn’t load this bag." onRetry={() => void refetch()} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Image
              source={listing.imageUrl ?? undefined}
              style={styles.hero}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.body}>
              <View style={styles.rowBetween}>
                <Text style={styles.store} numberOfLines={1}>
                  {listing.store.name}
                </Text>
                <Text style={styles.rating}>
                  ★ {listing.store.rating.toFixed(1)} ({listing.store.reviewCount})
                </Text>
              </View>
              <View style={styles.titleRow}>
                <Package size={22} color={colors.brand[600]} />
                <Text style={styles.title}>{listing.title}</Text>
              </View>
              <PriceTag
                originalMinor={listing.originalPrice}
                priceMinor={listing.price}
                currency={listing.currency}
              />

              <View style={styles.chips}>
                <PickupWindowChip start={listing.pickupStart} end={listing.pickupEnd} />
                <Badge
                  label={soldOut ? 'Sold out' : `${listing.quantityRemaining} left`}
                  tone={soldOut ? 'danger' : 'brand'}
                />
              </View>

              <Section title="What to expect" icon={Sparkles}>
                <Text style={styles.paragraph}>
                  {listing.description ??
                    'A surprise selection of surplus food, rescued from waste.'}
                </Text>
              </Section>

              {listing.allergenInfo ? (
                <Section title="Allergens" icon={Wheat}>
                  <Text style={styles.paragraph}>{listing.allergenInfo}</Text>
                </Section>
              ) : null}

              <Section title="Pickup location" icon={MapPin}>
                <Text style={styles.paragraph}>{listing.store.address}</Text>
              </Section>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.footerHint}>
                {soldOut ? 'No bags left' : `${listing.quantityRemaining} available`}
              </Text>
              <PriceTag
                originalMinor={listing.originalPrice}
                priceMinor={listing.price}
                currency={listing.currency}
              />
            </View>
            <Button
              label={soldOut ? 'Sold out' : 'Reserve'}
              onPress={onReserve}
              disabled={soldOut}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Icon size={18} color={colors.brand[600]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 160 },
  hero: { width: '100%', height: 280, backgroundColor: colors.surface.sunken },
  body: { padding: spacing[4], gap: spacing[3] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  store: { fontSize: typography.fontSize.base, color: colors.neutral[600], flex: 1 },
  rating: { fontSize: typography.fontSize.sm, color: colors.neutral[700], fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: {
    flex: 1,
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
  },
  chips: { flexDirection: 'row', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' },
  section: { gap: spacing[1], marginTop: spacing[2] },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.neutral[900] },
  paragraph: { fontSize: typography.fontSize.base, color: colors.neutral[600], lineHeight: 22 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.raised,
  },
  footerHint: { fontSize: typography.fontSize.xs, color: colors.neutral[500] },
});
