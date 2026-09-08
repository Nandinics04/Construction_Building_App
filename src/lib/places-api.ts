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

export async function fetchPlacePredictions(
  input: string,
  apiKey: string,
  options: PlaceSearchOptions = {}
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({
    input,
    key: apiKey,
    language: options.language ?? 'en',
  });

  if (options.country) {
    params.set('components', `country:${options.country}`);
  }
  if (options.types) {
    params.set('types', options.types);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
  );
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || data.status || 'Places search failed');
  }

  return (data.predictions ?? []).map((prediction: PlacePrediction) => ({
    description: prediction.description,
    place_id: prediction.place_id,
  }));
}

export async function fetchPlaceLocation(
  placeId: string,
  apiKey: string
): Promise<PlaceLocation> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: 'geometry',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );
  const data = await response.json();
  const location = data.result?.geometry?.location;

  if (!location) {
    throw new Error(data.error_message || 'Place details not found');
  }

  return { lat: location.lat, lng: location.lng };
}
