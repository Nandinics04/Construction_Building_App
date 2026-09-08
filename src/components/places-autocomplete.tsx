import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { fetchPlaceLocation, fetchPlacePredictions, type PlacePrediction } from '@/lib/places-api';

export type PlaceData = {
  description: string;
  place_id: string;
};

export type PlaceDetail = {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

type PlacesAutocompleteProps = {
  placeholder?: string;
  apiKey: string;
  country?: string;
  minLength?: number;
  debounceMs?: number;
  onPress: (data: PlaceData, details: PlaceDetail | null) => void;
  onFail?: (message: string) => void;
  styles?: {
    container?: StyleProp<ViewStyle>;
    textInput?: StyleProp<TextStyle>;
    listView?: StyleProp<ViewStyle>;
    row?: StyleProp<ViewStyle>;
    description?: StyleProp<TextStyle>;
    separator?: StyleProp<ViewStyle>;
  };
};

export function PlacesAutocomplete({
  placeholder = 'Search location',
  apiKey,
  country = 'in',
  minLength = 2,
  debounceMs = 300,
  onPress,
  onFail,
  styles: customStyles,
}: PlacesAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const onFailRef = useRef(onFail);
  const requestIdRef = useRef(0);

  onFailRef.current = onFail;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const predictions = await fetchPlacePredictions(trimmed, apiKey, {
          country,
          types: 'geocode',
        });
        if (requestId === requestIdRef.current) {
          setResults(predictions);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setResults([]);
          onFailRef.current?.(error instanceof Error ? error.message : 'Places search failed');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [apiKey, country, debounceMs, minLength, query]);

  const handleSelect = async (prediction: PlacePrediction) => {
    try {
      const location = await fetchPlaceLocation(prediction.place_id, apiKey);
      setQuery(prediction.description);
      setResults([]);
      onPress(
        { description: prediction.description, place_id: prediction.place_id },
        { geometry: { location: { lat: location.lat, lng: location.lng } } }
      );
    } catch (error) {
      onFailRef.current?.(error instanceof Error ? error.message : 'Place details not found');
    }
  };

  return (
    <View style={[styles.container, customStyles?.container]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor="#666"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.textInput, customStyles?.textInput]}
      />
      {loading ? <ActivityIndicator style={styles.loader} size="small" color="#666" /> : null}
      {results.length > 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={[styles.listView, customStyles?.listView]}>
          {results.map((item, index) => (
            <View key={item.place_id}>
              <TouchableOpacity
                style={[styles.row, customStyles?.row]}
                onPress={() => handleSelect(item)}>
                <Text numberOfLines={2} style={[styles.description, customStyles?.description]}>
                  {item.description}
                </Text>
              </TouchableOpacity>
              {index < results.length - 1 ? (
                <View style={[styles.separator, customStyles?.separator]} />
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    zIndex: 20,
  },
  textInput: {
    height: 50,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  loader: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  listView: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 200,
    marginTop: 6,
    zIndex: 30,
  },
  row: {
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  description: {
    fontSize: 14,
    color: '#111',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#c8c7cc',
  },
});
