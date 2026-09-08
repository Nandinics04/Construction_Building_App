import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { GOOGLE_MAPS_API_KEY } from '@/lib/env';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';

type SortKey = 'distance' | 'rating';

type PlaceResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: { photo_reference: string }[];
  opening_hours?: { open_now?: boolean };
  geometry?: { location?: { lat: number; lng: number } };
};

type Planner = {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  photoUrl: string | null;
  kind: 'Contractor' | 'Agency' | 'Planner';
  openNow: boolean | null;
  latitude: number;
  longitude: number;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kindFromTypes(types: string[] | undefined): Planner['kind'] {
  if (types?.includes('general_contractor')) return 'Contractor';
  if (types?.includes('real_estate_agency')) return 'Agency';
  return 'Planner';
}

function photoUrl(photoReference: string) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
}

export default function PlannersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { latitude, longitude } = useLocalSearchParams<{
    latitude?: string;
    longitude?: string;
  }>();

  const originLat = Number(latitude);
  const originLng = Number(longitude);

  const [places, setPlaces] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('distance');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchNearbyPlaces = useCallback(async () => {
    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      setError('Missing site location. Go back and confirm a place on the map.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const types = ['real_estate_agency', 'general_contractor'];
      const responses = await Promise.all(
        types.map((type) =>
          fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${originLat},${originLng}&radius=5000&type=${type}&key=${GOOGLE_MAPS_API_KEY}`
          ).then((res) => res.json())
        )
      );

      const allPlaces = responses.flatMap((response) => {
        if (response.status === 'OK' || response.status === 'ZERO_RESULTS') {
          return (response.results ?? []) as PlaceResult[];
        }
        throw new Error(response.status);
      });

      const unique = Array.from(new Map(allPlaces.map((place) => [place.place_id, place])).values());

      setPlaces(
        unique.map((place) => {
          const lat = place.geometry?.location?.lat ?? originLat;
          const lng = place.geometry?.location?.lng ?? originLng;
          return {
            id: place.place_id,
            name: place.name,
            address: place.vicinity ?? 'Address unavailable',
            rating: place.rating ?? 0,
            reviews: place.user_ratings_total ?? 0,
            distanceKm: haversineKm(originLat, originLng, lat, lng),
            photoUrl: place.photos?.[0] ? photoUrl(place.photos[0].photo_reference) : null,
            kind: kindFromTypes(place.types),
            openNow: place.opening_hours?.open_now ?? null,
            latitude: lat,
            longitude: lng,
          };
        })
      );
    } catch (err) {
      console.error('Error fetching places:', err);
      setError('Could not load nearby planners. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [originLat, originLng]);

  useEffect(() => {
    void fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.distanceKm - b.distanceKm;
    });
  }, [places, sortBy]);

  const handleDirections = (planner: Planner) => {
    const destination = `${planner.latitude},${planner.longitude}`;
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
  };

  const handleWebsite = async (placeId: string) => {
    try {
      setOpeningId(placeId);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.result?.website) {
        await Linking.openURL(data.result.website);
      } else {
        Alert.alert(t('common.website'), t('planners.noWebsite'));
      }
    } catch (err) {
      console.error('Error fetching website:', err);
      Alert.alert(t('common.website'), t('planners.websiteFail'));
    } finally {
      setOpeningId(null);
    }
  };

  const subtitle = loading
    ? t('planners.searching')
    : error
      ? t('planners.loadFail')
      : t('planners.found', { count: places.length });

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('planners.title')} subtitle={subtitle} onBack={() => router.back()} />

      {!loading && !error && places.length > 0 ? (
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
          <Text style={styles.centerTitle}>{t('planners.finding')}</Text>
          <Text style={styles.centerCopy}>{t('planners.findingCopy')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cloud-offline-outline" size={28} color={Connex.accent} />
          </View>
          <Text style={styles.centerTitle}>{t('planners.couldNot')}</Text>
          <Text style={styles.centerCopy}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void fetchNearbyPlaces()}>
            <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
          </Pressable>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="business-outline" size={28} color={Connex.accent} />
          </View>
          <Text style={styles.centerTitle}>{t('planners.none')}</Text>
          <Text style={styles.centerCopy}>{t('planners.noneCopy')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          {sortedPlaces.map((planner) => (
            <View key={planner.id} style={styles.card}>
              {planner.photoUrl ? (
                <Image source={{ uri: planner.photoUrl }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.photoFallback}>
                  <View style={styles.photoWell}>
                    <Ionicons name="business-outline" size={28} color={Connex.accent} />
                  </View>
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindText}>
                      {planner.kind === 'Contractor'
                        ? t('planners.contractor')
                        : planner.kind === 'Agency'
                          ? t('planners.agency')
                          : t('planners.planner')}
                    </Text>
                  </View>
                  {planner.openNow != null ? (
                    <View style={[styles.statusBadge, planner.openNow && styles.statusOpen]}>
                      <Text style={[styles.statusText, planner.openNow && styles.statusOpenText]}>
                    {planner.openNow ? t('common.openNow') : t('common.closed')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.name}>{planner.name}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={Connex.muted} />
                  <Text style={styles.meta} numberOfLines={2}>
                    {planner.address}
                  </Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.ratingPill}>
                    <Ionicons name="star" size={13} color="#C9A227" />
                    <Text style={styles.ratingText}>
                      {planner.rating > 0 ? planner.rating.toFixed(1) : t('common.new')}
                    </Text>
                    {planner.reviews > 0 ? (
                      <Text style={styles.reviewsText}>({planner.reviews})</Text>
                    ) : null}
                  </View>
                  <Text style={styles.distance}>{t('costCatalog.kmAway', { km: planner.distanceKm.toFixed(1) })}</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                    onPress={() => void handleWebsite(planner.id)}
                    disabled={openingId === planner.id}
                  >
                    {openingId === planner.id ? (
                      <ActivityIndicator size="small" color={Connex.ink} />
                    ) : (
                      <Ionicons name="globe-outline" size={16} color={Connex.ink} />
                    )}
                    <Text style={styles.ghostText}>{t('common.website')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.solidBtn, pressed && styles.pressed]}
                    onPress={() => handleDirections(planner)}
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
    gap: 8,
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
  statusBadge: {
    backgroundColor: Connex.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusOpen: {
    backgroundColor: '#EAF4EE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Connex.muted,
  },
  statusOpenText: {
    color: '#3F6F54',
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
  reviewsText: {
    fontSize: 12,
    color: Connex.muted,
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: Connex.muted,
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
    marginBottom: 16,
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
  retryBtn: {
    marginTop: 20,
    backgroundColor: Connex.ink,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    color: Connex.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});
