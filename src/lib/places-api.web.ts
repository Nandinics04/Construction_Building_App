export type PlacePrediction = {
  description: string;
  place_id: string;
};

export type PlaceLocation = {
  lat: number;
  lng: number;
};

type PlaceSearchOptions = {
  country?: string;
  language?: string;
  types?: string;
};

type GoogleLatLng = {
  lat: number | (() => number);
  lng: number | (() => number);
};

type GooglePlacesApi = {
  AutocompleteService: new () => {
    getPlacePredictions: (
      request: Record<string, unknown>,
      callback: (results: PlacePrediction[] | null, status: string) => void
    ) => void;
  };
  PlacesService: new (el: HTMLElement) => {
    getDetails: (
      request: Record<string, unknown>,
      callback: (
        result: { geometry?: { location?: GoogleLatLng } } | null,
        status: string
      ) => void
    ) => void;
  };
};

function getPlacesApi(): GooglePlacesApi {
  const google = (window as Window & { google?: { maps?: { places?: GooglePlacesApi } } })
    .google?.maps?.places;

  if (!google) {
    throw new Error('Google Maps Places failed to load');
  }

  return google;
}

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (typeof window !== 'undefined' && (window as Window & { google?: unknown }).google) {
    try {
      getPlacesApi();
      return Promise.resolve();
    } catch {
      // Script loaded without Places; fall through and inject it.
    }
  }

  if (mapsLoader) {
    return mapsLoader;
  }

  mapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="places"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.dataset.googleMaps = 'places';
    script.onload = () => resolve();
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}

function readLatLng(location: GoogleLatLng) {
  return {
    lat: typeof location.lat === 'function' ? location.lat() : location.lat,
    lng: typeof location.lng === 'function' ? location.lng() : location.lng,
  };
}

export async function fetchPlacePredictions(
  input: string,
  apiKey: string,
  options: PlaceSearchOptions = {}
): Promise<PlacePrediction[]> {
  await loadGoogleMaps(apiKey);
  const places = getPlacesApi();
  const service = new places.AutocompleteService();

  return new Promise((resolve, reject) => {
    service.getPlacePredictions(
      {
        input,
        language: options.language ?? 'en',
        types: options.types ? [options.types] : ['geocode'],
        componentRestrictions: options.country ? { country: options.country } : undefined,
      },
      (results, status) => {
        if (status === 'ZERO_RESULTS') {
          resolve([]);
          return;
        }
        if (status !== 'OK' || !results) {
          reject(new Error(status || 'Places search failed'));
          return;
        }
        resolve(
          results.map((prediction) => ({
            description: prediction.description,
            place_id: prediction.place_id,
          }))
        );
      }
    );
  });
}

export async function fetchPlaceLocation(
  placeId: string,
  apiKey: string
): Promise<PlaceLocation> {
  await loadGoogleMaps(apiKey);
  const places = getPlacesApi();
  const service = new places.PlacesService(document.createElement('div'));

  return new Promise((resolve, reject) => {
    service.getDetails({ placeId, fields: ['geometry'] }, (result, status) => {
      const location = result?.geometry?.location;
      if (status !== 'OK' || !location) {
        reject(new Error(status || 'Place details not found'));
        return;
      }
      resolve(readLatLng(location));
    });
  });
}
