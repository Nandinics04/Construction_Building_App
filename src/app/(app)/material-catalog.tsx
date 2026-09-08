import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';

const CATALOG_ITEMS = [
  {
    id: 1,
    title: 'Elevation Catalog',
    subtitle: 'Facades, levels, and exterior views',
    path: 'catalogs/elevation.pdf',
    icon: 'business-outline' as const,
  },
  {
    id: 2,
    title: 'Electrical Catalog',
    subtitle: 'Wiring, fixtures, and load specs',
    path: 'catalogs/electrical.pdf',
    icon: 'flash-outline' as const,
  },
  {
    id: 3,
    title: 'Plumbing Catalog',
    subtitle: 'Pipes, fittings, and sanitary ware',
    path: 'catalogs/plumbing.pdf',
    icon: 'water-outline' as const,
  },
  {
    id: 4,
    title: 'Door Catalog',
    subtitle: 'Doors, frames, and hardware',
    path: 'catalogs/door.pdf',
    icon: 'enter-outline' as const,
  },
  {
    id: 5,
    title: 'Colors Catalog',
    subtitle: 'Paints, finishes, and palettes',
    path: 'catalogs/colors.pdf',
    icon: 'color-palette-outline' as const,
  },
  {
    id: 6,
    title: 'Roof Catalog',
    subtitle: 'Tiles, sheets, and waterproofing',
    path: 'catalogs/roof.pdf',
    icon: 'home-outline' as const,
  },
  {
    id: 7,
    title: 'Floor Catalog',
    subtitle: 'Tiles, wood, and underlayment',
    path: 'catalogs/floor.pdf',
    icon: 'grid-outline' as const,
  },
  {
    id: 8,
    title: 'Safety Catalog',
    subtitle: 'PPE, site rules, and equipment',
    path: 'catalogs/safety.pdf',
    icon: 'shield-checkmark-outline' as const,
  },
];

export default function MaterialCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { t, tLabel } = useI18n();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('catalog.title')}
        subtitle={t('catalog.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {CATALOG_ITEMS.map((item) => {
          const selected = selectedId === item.id;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                pressed && styles.cardPressed,
              ]}
              onPress={() => {
                setSelectedId(item.id);
                const href =
                  `/(app)/catalog-pdf?title=${encodeURIComponent(item.title)}&path=${encodeURIComponent(item.path)}` as Href;
                router.push(href);
              }}
            >
              <View style={[styles.iconWell, selected && styles.iconWellSelected]}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={selected ? Connex.surface : Connex.accent}
                />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, selected && styles.titleSelected]}>{tLabel(item.title)}</Text>
                <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={selected ? Connex.surface : Connex.muted}
              />
            </Pressable>
          );
        })}
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
  cardSelected: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
  },
  titleSelected: {
    color: Connex.surface,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Connex.muted,
    lineHeight: 16,
  },
  subtitleSelected: {
    color: '#D6D3D1',
  },
});
