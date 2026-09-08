import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import { storage } from '@/lib/firebase';

const ROOM_LOOK: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; color: string }
> = {
  'Living Room': { icon: 'tv-outline', tint: '#E8F0F7', color: '#2F5D8A' },
  Bedroom: { icon: 'bed-outline', tint: '#EEE8F6', color: '#6D4B8A' },
  'Dining Room': { icon: 'restaurant-outline', tint: '#F4E4D6', color: '#C45C26' },
  Kitchen: { icon: 'cafe-outline', tint: '#F7EDD8', color: '#A16207' },
  Courtyard: { icon: 'leaf-outline', tint: '#EAF4EE', color: '#3F6F54' },
  'Study/Home Office': { icon: 'laptop-outline', tint: '#E8F0F7', color: '#2F5D8A' },
  'Entryway/Foyer': { icon: 'enter-outline', tint: '#EEEAE6', color: '#5C534A' },
  Bathroom: { icon: 'water-outline', tint: '#E8F0F7', color: '#2F5D8A' },
  'Pooja Room': { icon: 'flower-outline', tint: '#F4E4D6', color: '#C45C26' },
};

interface RoomCategory {
  name: string;
  subcategories: string[];
}

const styleData: { [key: string]: RoomCategory[] } = {
  'Traditional': [
    {
      name: 'Living Room',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Entertainment & Electronics',
        'Storage & Utility'
      ]
    },
    {
      name: 'Bedroom',
      subcategories: [
        'Furniture',
        'Bedding Essentials',
        'Decor & Accessories',
        'Storage & Organization',
        'Lighting'
      ]
    },
    {
      name: 'Dining Room',
      subcategories: [
        'Furniture',
        'Tableware & Dining Essentials',
        'Decor & Accessories',
        'Lighting'
      ]
    },
    {
      name: 'Kitchen',
      subcategories: [
        'Major Appliances',
        'Small Appliances',
        'Cookware & Bakeware',
        'Storage & Organization',
        'Dining & Serving',
        'Miscellaneous'
      ]
    },
    {
      name: 'Courtyard',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Gardening & Landscaping'
      ]
    },
    {
      name: 'Study/Home Office',
      subcategories: [
        'Furniture',
        'Tech & Accessories',
        'Office Supplies',
        'Decor'
      ]
    },
    {
      name: 'Entryway/Foyer',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting'
      ]
    },
    {
      name: 'Bathroom',
      subcategories: [
        'Sanitary Fixtures',
        'Storage & Organization',
        'Toiletries & Essentials',
        'Decor & Accessories'
      ]
    },
    {
      name: 'Pooja Room',
      subcategories: [
        'Furniture',
        'Religious Essentials',
        'Storage & Organization',
        'Decor'
      ]
    }
  ],
  'Modern': [
    {
      name: 'Living Room',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Entertainment & Electronics',
        'Smart Gadgets',
        'Storage & Utility'
      ]
    },
    {
      name: 'Bedroom',
      subcategories: [
        'Furniture',
        'Bedding Essentials',
        'Decor & Accessories',
        'Storage & Organization',
        'Lighting',
        'Smart Gadgets & Automation'
      ]
    },
    {
      name: 'Dining Room',
      subcategories: [
        'Furniture',
        'Tableware & Dining Essentials',
        'Decor & Accessories',
        'Lighting',
        'Smart Appliances'
      ]
    },
    {
      name: 'Kitchen',
      subcategories: [
        'Major Appliances',
        'Small Appliances',
        'Cookware & Bakeware',
        'Storage & Organization',
        'Dining & Serving',
        'Miscellaneous'
      ]
    },
    {
      name: 'Courtyard',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Gardening & Landscaping',
        'Smart Gadgets'
      ]
    },
    {
      name: 'Study/Home Office',
      subcategories: [
        'Furniture',
        'Tech & Accessories',
        'Office Supplies',
        'Decor',
        'Smart Gadgets'
      ]
    },
    {
      name: 'Entryway/Foyer',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Smart Gadgets'
      ]
    },
    {
      name: 'Bathroom',
      subcategories: [
        'Sanitary Fixtures',
        'Storage & Organization',
        'Toiletries & Essentials',
        'Decor & Accessories',
        'Smart Gadgets',
        'Luxury Accessories'
      ]
    },
    {
      name: 'Pooja Room',
      subcategories: [
        'Furniture',
        'Religious Essentials',
        'Storage & Organization',
        'Decor',
        'Smart Gadgets'
      ]
    }
  ],
  'Industrial': [
    {
      name: 'Living Room',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Entertainment & Electronics',
        'Storage & Utility'
      ]
    },
    {
      name: 'Bedroom',
      subcategories: [
        'Furniture',
        'Bedding Essentials',
        'Decor & Accessories',
        'Storage & Organization',
        'Lighting'
      ]
    },
    {
      name: 'Dining Room',
      subcategories: [
        'Furniture',
        'Tableware & Dining Essentials',
        'Decor & Accessories',
        'Lighting',
        'Smart Appliances'
      ]
    },
    {
      name: 'Kitchen',
      subcategories: [
        'Major Appliances',
        'Small Appliances',
        'Cookware & Bakeware',
        'Storage & Organization',
        'Dining & Serving',
        'Miscellaneous'
      ]
    },
    {
      name: 'Courtyard',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Gardening & Landscaping',
        'Smart Gadgets'
      ]
    },
    {
      name: 'Study/Home Office',
      subcategories: [
        'Furniture',
        'Tech & Accessories',
        'Office Supplies',
        'Decor',
        'Smart Gadgets'
      ]
    },
    {
      name: 'Entryway/Foyer',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Smart Gadgets'
      ]
    },
    {
      name: 'Bathroom',
      subcategories: [
        'Sanitary Fixtures',
        'Storage & Organization',
        'Toiletries & Essentials',
        'Decor & Accessories',
        'Smart Gadgets',
        'Luxury Accessories'
      ]
    },
    {
      name: 'Pooja Room',
      subcategories: [
        'Furniture',
        'Religious Essentials',
        'Storage & Organization',
        'Decor',
        'Smart Gadgets'
      ]
    }
  ],
  'Transitional': [
    {
      name: 'Living Room',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Entertainment & Electronics',
        'Storage & Utility'
      ]
    },
    {
      name: 'Bedroom',
      subcategories: [
        'Furniture',
        'Bedding Essentials',
        'Decor & Accessories',
        'Storage & Organization',
        'Lighting'
      ]
    },
    {
      name: 'Dining Room',
      subcategories: [
        'Furniture',
        'Tableware & Dining Essentials',
        'Decor & Accessories',
        'Lighting'
      ]
    },
    {
      name: 'Kitchen',
      subcategories: [
        'Major Appliances',
        'Small Appliances',
        'Cookware & Bakeware',
        'Storage & Organization',
        'Dining & Serving',
        'Miscellaneous'
      ]
    },
    {
      name: 'Courtyard',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Gardening & Landscaping'
      ]
    },
    {
      name: 'Study/Home Office',
      subcategories: [
        'Furniture',
        'Tech & Accessories',
        'Office Supplies',
        'Decor'
      ]
    },
    {
      name: 'Entryway/Foyer',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting'
      ]
    },
    {
      name: 'Bathroom',
      subcategories: [
        'Sanitary Fixtures',
        'Storage & Organization',
        'Toiletries & Essentials',
        'Decor & Accessories'
      ]
    },
    {
      name: 'Pooja Room',
      subcategories: [
        'Furniture',
        'Religious Essentials',
        'Storage & Organization',
        'Decor'
      ]
    }
  ],
  'Mid-Century Modern': [
    {
      name: 'Living Room',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting',
        'Entertainment & Electronics',
        'Storage & Utility'
      ]
    },
    {
      name: 'Bedroom',
      subcategories: [
        'Furniture',
        'Bedding Essentials',
        'Decor & Accessories',
        'Storage & Organization',
        'Lighting'
      ]
    },
    {
      name: 'Dining Room',
      subcategories: [
        'Furniture',
        'Tableware & Dining Essentials',
        'Decor & Accessories',
        'Lighting'
      ]
    },
    {
      name: 'Kitchen',
      subcategories: [
        'Major Appliances',
        'Small Appliances',
        'Cookware & Bakeware',
        'Storage & Organization',
        'Dining & Serving',
        'Miscellaneous'
      ]
    },
    {
      name: 'Courtyard',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Gardening & Landscaping'
      ]
    },
    {
      name: 'Study/Home Office',
      subcategories: [
        'Furniture',
        'Tech & Accessories',
        'Office Supplies',
        'Decor'
      ]
    },
    {
      name: 'Entryway/Foyer',
      subcategories: [
        'Furniture',
        'Decor & Accessories',
        'Lighting'
      ]
    },
    {
      name: 'Bathroom',
      subcategories: [
        'Sanitary Fixtures',
        'Storage & Organization',
        'Toiletries & Essentials',
        'Decor & Accessories'
      ]
    },
    {
      name: 'Pooja Room',
      subcategories: [
        'Furniture',
        'Religious Essentials',
        'Storage & Organization',
        'Decor'
      ]
    }
  ]
};

export default function RoomSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, tLabel } = useI18n();
  const { style } = useLocalSearchParams<{ style?: string }>();
  const styleName = Array.isArray(style) ? style[0] : style;
  const rooms: RoomCategory[] = (styleName && styleData[styleName]) || [];

  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const tileSize = (width - 40) / 2;

  const handleCategoryPress = async (category: string) => {
    try {
      setLoading(true);
      setSelectedCategory(category);
      setImages([]);
      setLoadingProgress(0);
      setImageModalVisible(true);

      const storagePath = `categories/${styleName}/${expandedRoom}/${category}`;
      const categoryRef = ref(storage, storagePath);
      const foldersList = await listAll(categoryRef);

      const totalFolders = Math.max(foldersList.prefixes.length, 1);
      let processedFolders = 0;
      const imageUrls: string[] = [];

      for (const folderRef of foldersList.prefixes) {
        try {
          const folderContents = await listAll(folderRef);

          if (folderContents.items.length > 0) {
            const directImageUrls = await Promise.all(
              folderContents.items.map(async (imageRef) => {
                try {
                  return await getDownloadURL(imageRef);
                } catch (error) {
                  console.error('Error getting direct image URL:', error);
                  return null;
                }
              })
            );
            imageUrls.push(...directImageUrls.filter((url): url is string => url !== null));
          }

          for (const nestedRef of folderContents.prefixes) {
            try {
              const nestedContents = await listAll(nestedRef);
              const nestedImageUrls = await Promise.all(
                nestedContents.items.map(async (imageRef) => {
                  try {
                    return await getDownloadURL(imageRef);
                  } catch (error) {
                    console.error('Error getting nested image URL:', error);
                    return null;
                  }
                })
              );
              imageUrls.push(...nestedImageUrls.filter((url): url is string => url !== null));
            } catch (error) {
              console.error('Error processing nested folder:', nestedRef.name, error);
            }
          }

          processedFolders++;
          setLoadingProgress((processedFolders / totalFolders) * 100);
          setImages([...imageUrls]);
        } catch (error) {
          console.error('Error processing folder:', folderRef.name, error);
          processedFolders++;
          setLoadingProgress((processedFolders / totalFolders) * 100);
        }
      }
    } catch (error: unknown) {
      console.error('Error:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
      setLoadingProgress(100);
    }
  };

  const closeGallery = () => {
    setImageModalVisible(false);
    setPreviewUri(null);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('rooms.title')}
        subtitle={styleName ? t('rooms.look', { style: tLabel(styleName) }) : t('rooms.pickCategory')}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.intro}>
          <Text style={styles.kicker}>{styleName ? tLabel(styleName) : t('home.interior')}</Text>
          <Text style={styles.introTitle}>{t('rooms.intro')}</Text>
          <Text style={styles.introCopy}>{t('rooms.copy')}</Text>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('rooms.notFound')}</Text>
            <Text style={styles.emptyCopy}>{t('rooms.notFoundCopy')}</Text>
          </View>
        ) : (
          rooms.map((room) => {
            const open = expandedRoom === room.name;
            const look = ROOM_LOOK[room.name] ?? {
              icon: 'home-outline' as const,
              tint: Connex.accentSoft,
              color: Connex.accent,
            };

            return (
              <View key={room.name} style={[styles.roomCard, open && styles.roomCardOpen]}>
                <Pressable
                  style={({ pressed }) => [styles.roomHeader, pressed && styles.pressed]}
                  onPress={() => setExpandedRoom(open ? null : room.name)}
                >
                  <View style={[styles.iconWell, { backgroundColor: look.tint }]}>
                    <Ionicons name={look.icon} size={20} color={look.color} />
                  </View>
                  <View style={styles.roomCopy}>
                    <Text style={styles.roomName}>{tLabel(room.name)}</Text>
                    <Text style={styles.roomMeta}>{t('rooms.categories', { count: room.subcategories.length })}</Text>
                  </View>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Connex.muted}
                  />
                </Pressable>

                {open ? (
                  <View style={styles.categories}>
                    {room.subcategories.map((category) => {
                      const busy = loading && selectedCategory === category;
                      return (
                        <Pressable
                          key={category}
                          style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}
                          onPress={() => void handleCategoryPress(category)}
                        >
                          <Text style={styles.categoryText}>{tLabel(category)}</Text>
                          {busy ? (
                            <ActivityIndicator size="small" color={Connex.accent} />
                          ) : (
                            <Ionicons name="images-outline" size={18} color={Connex.muted} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={imageModalVisible}
        animationType="slide"
        onRequestClose={closeGallery}
      >
        <View style={styles.modal}>
          <ScreenHeader
            title={selectedCategory ? tLabel(selectedCategory) : t('rooms.gallery')}
            subtitle={
              loading
                ? t('rooms.loadingPct', { pct: Math.round(loadingProgress) })
                : t('rooms.photoCount', { count: images.length })
            }
            onBack={closeGallery}
          />

          {loading ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(loadingProgress, 100)}%` }]} />
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {loading && images.length === 0 ? (
              <View style={styles.state}>
                <ActivityIndicator size="large" color={Connex.accent} />
                <Text style={styles.stateTitle}>{t('rooms.loadingPhotos')}</Text>
                <Text style={styles.stateCopy}>{t('rooms.loadingPhotosCopy')}</Text>
              </View>
            ) : images.length > 0 ? (
              images.map((url, index) => (
                <Pressable
                  key={`${url}-${index}`}
                  onPress={() => setPreviewUri(url)}
                  style={[styles.tile, { width: tileSize, height: tileSize }]}
                >
                  <Image source={{ uri: url }} style={styles.tileImage} contentFit="cover" />
                </Pressable>
              ))
            ) : (
              <View style={styles.state}>
                <View style={styles.stateIcon}>
                  <Ionicons name="images-outline" size={28} color={Connex.accent} />
                </View>
                <Text style={styles.stateTitle}>{t('rooms.noPhotos')}</Text>
                <Text style={styles.stateCopy}>{t('rooms.noPhotosCopy')}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
          <Pressable style={styles.preview} onPress={() => setPreviewUri(null)}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" />
            ) : null}
            <View style={[styles.previewClose, { top: insets.top + 12 }]}>
              <Ionicons name="close" size={22} color={Connex.surface} />
            </View>
          </Pressable>
        </Modal>
      </Modal>
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
  introCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Connex.muted,
  },
  roomCard: {
    backgroundColor: Connex.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Connex.line,
    overflow: 'hidden',
  },
  roomCardOpen: {
    borderColor: Connex.accent,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCopy: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
  },
  roomMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Connex.muted,
  },
  categories: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Connex.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categoryText: {
    flex: 1,
    paddingRight: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Connex.ink,
  },
  pressed: {
    opacity: 0.88,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
  },
  emptyCopy: {
    marginTop: 8,
    fontSize: 14,
    color: Connex.muted,
    textAlign: 'center',
  },
  modal: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Connex.line,
  },
  progressFill: {
    height: 3,
    backgroundColor: Connex.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  tile: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Connex.accentSoft,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  state: {
    width: '100%',
    paddingVertical: 64,
    alignItems: 'center',
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
  },
  stateCopy: {
    marginTop: 8,
    fontSize: 14,
    color: Connex.muted,
    textAlign: 'center',
  },
  preview: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  previewClose: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 