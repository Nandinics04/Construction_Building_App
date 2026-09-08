import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';

const DESIGN_STYLES = [
  {
    name: 'Traditional',
    blurb: 'Carved wood, warm palettes, and classic layouts',
    icon: 'flower-outline' as const,
    tint: '#F4E4D6',
    iconColor: '#C45C26',
  },
  {
    name: 'Modern',
    blurb: 'Clean lines, open rooms, and quiet materials',
    icon: 'square-outline' as const,
    tint: '#E8F0F7',
    iconColor: '#2F5D8A',
  },
  {
    name: 'Industrial',
    blurb: 'Metal, brick, raw textures, and factory light',
    icon: 'hammer-outline' as const,
    tint: '#EEEAE6',
    iconColor: '#5C534A',
  },
  {
    name: 'Transitional',
    blurb: 'Classic comfort mixed with modern ease',
    icon: 'swap-horizontal-outline' as const,
    tint: '#EAF4EE',
    iconColor: '#3F6F54',
  },
  {
    name: 'Mid-Century Modern',
    blurb: 'Organic shapes, teak, and retro color',
    icon: 'color-filter-outline' as const,
    tint: '#F7EDD8',
    iconColor: '#A16207',
  },
];

export default function InteriorDesignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tLabel } = useI18n();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('interior.title')}
        subtitle={t('interior.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.intro}>
          <Text style={styles.kicker}>{t('interior.kicker')}</Text>
          <Text style={styles.introTitle}>{t('interior.intro')}</Text>
          <Text style={styles.quote}>{t('interior.quote')}</Text>
        </View>

        {DESIGN_STYLES.map((item) => (
          <Pressable
            key={item.name}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() =>
              router.push({
                pathname: '/(app)/room-selection',
                params: { style: item.name },
              })
            }
          >
            <View style={[styles.iconWell, { backgroundColor: item.tint }]}>
              <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{tLabel(item.name)}</Text>
              <Text style={styles.cardBlurb}>{item.blurb}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Connex.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  intro: {
    backgroundColor: Connex.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Connex.line,
    marginBottom: 6,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: Connex.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  introTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Connex.ink,
    letterSpacing: -0.4,
  },
  quote: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: Connex.muted,
  },
  card: {
    backgroundColor: Connex.surface,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Connex.line,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
  },
  cardBlurb: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: Connex.muted,
  },
});
