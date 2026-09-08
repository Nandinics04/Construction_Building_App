import { createElement, forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type SiteMapHandle = {
  animateToRegion: (region: MapRegion) => void;
};

type SiteMapProps = {
  region: MapRegion;
  marker?: { latitude: number; longitude: number } | null;
};

function embedSrc(lat: number, lng: number, latitudeDelta: number) {
  const span = Math.max(latitudeDelta, 0.01);
  const bbox = `${lng - span},${lat - span},${lng + span},${lat + span}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export const SiteMap = forwardRef<SiteMapHandle, SiteMapProps>(function SiteMap(
  { region, marker },
  ref
) {
  const [view, setView] = useState(region);

  useImperativeHandle(ref, () => ({
    animateToRegion(next) {
      setView(next);
    },
  }));

  const lat = marker?.latitude ?? view.latitude;
  const lng = marker?.longitude ?? view.longitude;

  return (
    <View style={styles.fill}>
      {createElement('iframe', {
        src: embedSrc(lat, lng, view.latitudeDelta),
        style: { width: '100%', height: '100%', border: 0 },
        title: 'Map',
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
