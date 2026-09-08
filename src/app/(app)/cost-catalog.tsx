import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { PlacesAutocomplete, type PlaceDetail } from '@/components/places-autocomplete';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import { GOOGLE_MAPS_API_KEY } from '@/lib/env';
import { verifyGoogleMapsApiKey } from '@/lib/google-maps';

const MATERIAL_CHIPS = ['Cement', 'Steel', 'Sand', 'Bricks', 'Tiles', 'Paint'] as const;

type SortKey = 'rating' | 'distance';

type Supplier = {
  id: string;
  name: string;
  rating: number;
  distance: number;
  address: string;
  phone: string;
  placeId: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
};

export default function CostCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tLabel } = useI18n();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    void getCurrentLocation();
    void verifyGoogleMapsApiKey();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('plans.permissionTitle'), t('costCatalog.permission'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const nextLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setSelectedLocation(nextLocation);
      await searchNearbySuppliers(nextLocation.latitude, nextLocation.longitude, searchQuery);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(t('plans.errorTitle'), t('costCatalog.locationFail'));
    }
  };

  const searchNearbySuppliers = async (latitude: number, longitude: number, keyword: string) => {
    try {
      setLoading(true);
      const searchKeyword = keyword ? `${keyword} suppliers` : '';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=store&keyword=${encodeURIComponent(searchKeyword)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'REQUEST_DENIED') {
        Alert.alert(t('plans.searchTitle'), t('costCatalog.apiFail'));
        return;
      }

      if (data.results) {
        const mappedSuppliers: Supplier[] = await Promise.all(
          data.results.map(async (place: {
            place_id: string;
            name: string;
            rating?: number;
            vicinity?: string;
            photos?: { photo_reference: string }[];
            geometry: { location: { lat: number; lng: number } };
          }) => {
            const detailsResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,photos&key=${GOOGLE_MAPS_API_KEY}`
            );
            const detailsData = await detailsResponse.json();

            let photoUrl = '';
            if (place.photos?.[0]) {
              photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
            }

            return {
              id: place.place_id,
              name: place.name,
              rating: place.rating || 0,
              distance: calculateDistance(
                latitude,
                longitude,
                place.geometry.location.lat,
                place.geometry.location.lng
              ),
              address: place.vicinity ?? 'Address unavailable',
              phone: detailsData.result?.formatted_phone_number || 'N/A',
              placeId: place.place_id,
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              photoUrl,
            };
          })
        );
        setSuppliers(mappedSuppliers);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      Alert.alert(t('costCatalog.none'), t('costCatalog.loadFail'));
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  useEffect(() => {
    if (selectedLocation && searchQuery.trim().length > 0) {
      void searchNearbySuppliers(
        selectedLocation.latitude,
        selectedLocation.longitude,
        searchQuery.trim()
      );
    }
  }, [searchQuery]);

  const handleCall = (phoneNumber: string) => {
    if (phoneNumber !== 'N/A') {
      void Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleDirections = (supplier: Supplier) => {
    const url = Platform.select({
      web: `https://www.google.com/maps/dir/?api=1&destination=${supplier.latitude},${supplier.longitude}`,
      ios: `maps:?q=${supplier.name}&ll=${supplier.latitude},${supplier.longitude}`,
      android: `geo:${supplier.latitude},${supplier.longitude}?q=${supplier.name}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${supplier.latitude},${supplier.longitude}`,
    });

    if (url) {
      void Linking.openURL(url);
    }
  };

  const sortedSuppliers = useMemo(() => {
    return [...suppliers].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.distance - b.distance;
    });
  }, [suppliers, sortBy]);

  const subtitle = loading
    ? t('costCatalog.searching')
    : suppliers.length > 0
      ? t('costCatalog.found', { count: suppliers.length })
      : t('costCatalog.hint');

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('costCatalog.title')} subtitle={subtitle} onBack={() => router.back()} />

      <View style={styles.searchPanel}>
        <View style={styles.searchRow}>
          <PlacesAutocomplete
            placeholder={t('common.searchLocation')}
            apiKey={GOOGLE_MAPS_API_KEY}
            onPress={(_data, details: PlaceDetail | null) => {
              if (details) {
                setSelectedLocation({
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng,
                });
                void searchNearbySuppliers(
                  details.geometry.location.lat,
                  details.geometry.location.lng,
                  searchQuery
                );
              }
            }}
            styles={{
              container: { flex: 1 },
              textInput: {
                height: 50,
                backgroundColor: Connex.bg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: Connex.line,
                paddingHorizontal: 16,
                fontSize: 16,
                color: Connex.ink,
                marginBottom: 0,
              },
              listView: {
                backgroundColor: Connex.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: Connex.line,
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 6,
                maxHeight: 200,
                zIndex: 9999,
              },
            }}
            onFail={(error) => {
              console.error('GooglePlaces Error:', error);
              Alert.alert(t('plans.searchTitle'), t('costCatalog.searchFail'));
            }}
          />
          <Pressable
            style={({ pressed }) => [styles.gpsBtn, pressed && styles.pressed]}
            onPress={() => void getCurrentLocation()}
            accessibilityLabel="Use current location"
          >
            <Ionicons name="locate-outline" size={20} color={Connex.ink} />
          </Pressable>
        </View>

        <View style={styles.itemSearch}>
          <Ionicons name="search-outline" size={18} color={Connex.muted} />
          <TextInput
            style={styles.itemInput}
            placeholder={t('costCatalog.itemsPlaceholder')}
            placeholderTextColor={Connex.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (selectedLocation && searchQuery.trim()) {
                void searchNearbySuppliers(
                  selectedLocation.latitude,
                  selectedLocation.longitude,
                  searchQuery.trim()
                );
              }
            }}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Connex.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {MATERIAL_CHIPS.map((chip) => {
            const active = searchQuery.trim().toLowerCase() === chip.toLowerCase();
            return (
              <Pressable
                key={chip}
                style={[styles.chip, active && styles.chipOn]}
                onPress={() => setSearchQuery(chip)}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{tLabel(chip)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {suppliers.length > 0 && !loading ? (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>{t('common.sort')}</Text>
          {(['distance', 'rating'] as const).map((key) => {
            const active = sortBy === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSortBy(key)}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {key === 'distance' ? t('common.distance') : t('common.rating')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Connex.accent} />
          <Text style={styles.centerTitle}>{t('costCatalog.finding')}</Text>
          <Text style={styles.centerCopy}>{t('costCatalog.findingCopy')}</Text>
        </View>
      ) : suppliers.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="storefront-outline" size={26} color={Connex.accent} />
          </View>
          <Text style={styles.centerTitle}>{t('costCatalog.none')}</Text>
          <Text style={styles.centerCopy}>{t('costCatalog.noneCopy')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sortedSuppliers.map((supplier) => (
            <View key={supplier.id} style={styles.card}>
              {supplier.photoUrl ? (
                <Image
                  source={{ uri: supplier.photoUrl }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.photoFallback}>
                  <View style={styles.photoWell}>
                    <Ionicons name="storefront-outline" size={28} color={Connex.accent} />
                  </View>
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindText}>{t('common.supplier')}</Text>
                  </View>
                  <View style={styles.ratingPill}>
                    <Ionicons name="star" size={13} color="#C9A227" />
                    <Text style={styles.ratingText}>
                      {supplier.rating > 0 ? supplier.rating.toFixed(1) : t('common.new')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.name}>{supplier.name}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={Connex.muted} />
                  <Text style={styles.meta} numberOfLines={2}>
                    {supplier.address}
                  </Text>
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.distance}>{t('costCatalog.kmAway', { km: supplier.distance.toFixed(1) })}</Text>
                  <Text style={styles.phone} numberOfLines={1}>
                    {supplier.phone}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.ghostBtn,
                      supplier.phone === 'N/A' && styles.btnDisabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleCall(supplier.phone)}
                    disabled={supplier.phone === 'N/A'}
                  >
                    <Ionicons name="call-outline" size={16} color={Connex.ink} />
                    <Text style={styles.ghostText}>{t('common.call')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.solidBtn, pressed && styles.pressed]}
                    onPress={() => handleDirections(supplier)}
                  >
                    <Ionicons name="navigate-outline" size={16} color={Connex.surface} />
                    <Text style={styles.solidText}>{t('common.directions')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  searchPanel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
    zIndex: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  gpsBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Connex.surface,
    borderWidth: 1,
    borderColor: Connex.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: Connex.surface,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 14,
  },
  itemInput: {
    flex: 1,
    fontSize: 16,
    color: Connex.ink,
  },
  chips: {
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Connex.surface,
    borderWidth: 1,
    borderColor: Connex.line,
    marginRight: 8,
  },
  chipOn: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Connex.ink,
  },
  chipTextOn: {
    color: Connex.surface,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Connex.muted,
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Connex.surface,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  sortChipActive: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Connex.ink,
  },
  sortChipTextActive: {
    color: Connex.surface,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  card: {
    backgroundColor: Connex.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Connex.line,
  },
  photo: {
    width: '100%',
    height: 168,
    backgroundColor: Connex.accentSoft,
  },
  photoFallback: {
    height: 132,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Connex.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kindBadge: {
    backgroundColor: Connex.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kindText: {
    fontSize: 11,
    fontWeight: '700',
    color: Connex.accent,
    letterSpacing: 0.2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F7F1DC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: Connex.ink,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Connex.muted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: Connex.muted,
  },
  phone: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: Connex.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  ghostBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Connex.line,
    backgroundColor: Connex.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  solidBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: Connex.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '700',
    color: Connex.ink,
  },
  solidText: {
    fontSize: 14,
    fontWeight: '700',
    color: Connex.surface,
  },
  pressed: {
    opacity: 0.88,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
    textAlign: 'center',
  },
  centerCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Connex.muted,
    textAlign: 'center',
  },
});
