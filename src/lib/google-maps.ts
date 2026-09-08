import { Alert, Platform } from 'react-native';

import { GOOGLE_MAPS_API_KEY } from '@/lib/env';
import { fetchPlacePredictions } from '@/lib/places-api';

export function googleMapsDeniedMessage(errorMessage?: string) {
  const message = errorMessage?.toLowerCase() ?? '';

  if (message.includes('billing')) {
    return 'Enable Billing on this Google Cloud project, then turn on Maps JavaScript API, Places API, and Geocoding API.';
  }

  if (message.includes('not authorized') || message.includes('api restrictions')) {
    return 'Enable Places API (the one without New) and Geocoding API on FlexPay, then add both to this API key restrictions. Places API (New) alone is not enough for this app.';
  }

  if (message.includes('referer') || message.includes('referrer')) {
    return 'This API key is blocked for this website. Add your domain (or localhost) under Application restrictions.';
  }

  return errorMessage || 'Google Maps denied this request. Check the API key and enabled APIs.';
}

export async function verifyGoogleMapsApiKey() {
  if (!GOOGLE_MAPS_API_KEY) {
    Alert.alert(
      'Google Maps key missing',
      'Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file and restart Expo.'
    );
    return;
  }

  try {
    await fetchPlacePredictions('Hyderabad', GOOGLE_MAPS_API_KEY, {
      country: 'in',
      types: 'geocode',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (Platform.OS === 'web' && message.toLowerCase().includes('failed to fetch')) {
      return;
    }
    console.error('Google Maps API key error:', message);
    Alert.alert('Google Maps setup required', googleMapsDeniedMessage(message));
  }
}
