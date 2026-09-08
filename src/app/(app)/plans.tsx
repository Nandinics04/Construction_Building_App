import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PlacesAutocomplete, type PlaceDetail } from '@/components/places-autocomplete';
import { SiteMap, type MapRegion, type SiteMapHandle } from '@/components/site-map';
import { ScreenHeader } from '@/components/screen-header';
import { useI18n } from '@/i18n/language-provider';
import { GOOGLE_MAPS_API_KEY } from '@/lib/env';
import { verifyGoogleMapsApiKey } from '@/lib/google-maps';
import { Connex } from '@/constants/theme';

const INITIAL_REGION: MapRegion = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function PlansScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const mapRef = useRef<SiteMapHandle | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapRegion>(INITIAL_REGION);
  const [selectedLocation, setSelectedLocation] = useState<MapRegion | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentLocation();
    void verifyGoogleMapsApiKey();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('plans.permissionTitle'), t('plans.permission'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation: MapRegion = {
        ...INITIAL_REGION,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(newLocation);
      setSelectedLocation(newLocation);
      mapRef.current?.animateToRegion(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(t('plans.errorTitle'), t('plans.locationFail'));
    }
  };

  const handleLocationSelect = (_data: { description: string }, details: PlaceDetail | null) => {
    if (!details) {
      setSearchError(t('plans.missingDetails'));
      return;
    }

    setSearchError(null);
    const newLocation: MapRegion = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };

    setSelectedLocation(newLocation);
    mapRef.current?.animateToRegion(newLocation);
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) return;

    router.push({
      pathname: '/(app)/planners-list',
      params: {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      },
    });
  };

  const mapRegion = selectedLocation ?? currentLocation;

  return (
    <View style={styles.container}>
      <SiteMap
        ref={mapRef}
        region={mapRegion}
        marker={
          selectedLocation
            ? {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }
            : null
        }
      />

      <View style={styles.headerOverlay} pointerEvents="box-none">
        <ScreenHeader title={t('plans.title')} subtitle={t('plans.subtitle')} onBack={() => router.back()} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheet}
      >
        <View style={styles.searchRow}>
          <PlacesAutocomplete
            placeholder={t('plans.placeholder')}
            apiKey={GOOGLE_MAPS_API_KEY}
            onPress={handleLocationSelect}
            styles={{
              container: {
                flex: 1,
              },
              textInput: {
                height: 50,
                backgroundColor: Connex.bg,
                borderRadius: 12,
                paddingHorizontal: 16,
                fontSize: 16,
                color: Connex.ink,
              },
              listView: {
                backgroundColor: Connex.surface,
                borderRadius: 12,
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 8,
                maxHeight: 200,
                borderWidth: 1,
                borderColor: Connex.line,
              },
            }}
            onFail={(error) => {
              console.error('GooglePlaces Error:', error);
              Alert.alert(t('plans.searchTitle'), t('plans.searchError'));
            }}
          />
          <TouchableOpacity style={styles.locationButton} onPress={() => void getCurrentLocation()}>
            <Ionicons name="locate" size={22} color={Connex.ink} />
          </TouchableOpacity>
        </View>

        {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

        <TouchableOpacity
          style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
          disabled={!selectedLocation}
          onPress={handleConfirmLocation}
        >
          <Text style={styles.confirmButtonText}>{t('plans.confirm')}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Connex.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Connex.line,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  locationButton: {
    width: 50,
    height: 50,
    backgroundColor: Connex.bg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: Connex.ink,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: Connex.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 8,
    color: Connex.danger,
    fontSize: 13,
  },
});
