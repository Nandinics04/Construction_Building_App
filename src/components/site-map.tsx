import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Connex } from '@/constants/theme';

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

const TILE = 256;

function lngToX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * 2 ** zoom;
}

function latToY(lat: number, zoom: number) {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

function zoomFromDelta(latitudeDelta: number) {
  return Math.min(18, Math.max(4, Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.002)))));
}

function wrapTileX(x: number, zoom: number) {
  const n = 2 ** zoom;
  return ((x % n) + n) % n;
}

function tileUrl(zoom: number, x: number, y: number, useEsri: boolean) {
  const n = 2 ** zoom;
  if (y < 0 || y >= n) return null;
  const wrappedX = wrapTileX(x, zoom);
  if (useEsri) {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${y}/${wrappedX}`;
  }
  const host = ['a', 'b', 'c', 'd'][wrappedX % 4];
  return `https://${host}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wrappedX}/${y}@2x.png`;
}

export const SiteMap = forwardRef<SiteMapHandle, SiteMapProps>(function SiteMap(
  { region, marker },
  ref
) {
  const [view, setView] = useState(region);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [useEsri, setUseEsri] = useState(false);

  useImperativeHandle(ref, () => ({
    animateToRegion(next) {
      setView(next);
    },
  }));

  useEffect(() => {
    setView(region);
  }, [region]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  const zoom = zoomFromDelta(view.latitudeDelta);
  const lat = view.latitude;
  const lng = view.longitude;
  const markerLat = marker?.latitude ?? lat;
  const markerLng = marker?.longitude ?? lng;

  const tiles = useMemo(() => {
    if (size.width < 8 || size.height < 8) return [];

    const centerX = lngToX(lng, zoom);
    const centerY = latToY(lat, zoom);
    const originX = centerX - size.width / 2 / TILE;
    const originY = centerY - size.height / 2 / TILE;
    const minX = Math.floor(originX);
    const maxX = Math.ceil(originX + size.width / TILE);
    const minY = Math.floor(originY);
    const maxY = Math.ceil(originY + size.height / TILE);

    const next: { key: string; left: number; top: number; uri: string }[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const uri = tileUrl(zoom, x, y, useEsri);
        if (!uri) continue;
        next.push({
          key: `${useEsri ? 'e' : 'c'}-${zoom}-${x}-${y}`,
          left: (x - originX) * TILE,
          top: (y - originY) * TILE,
          uri,
        });
      }
    }
    return next;
  }, [lat, lng, zoom, size.width, size.height, useEsri]);

  const pinLeft = size.width / 2 + (lngToX(markerLng, zoom) - lngToX(lng, zoom)) * TILE;
  const pinTop = size.height / 2 + (latToY(markerLat, zoom) - latToY(lat, zoom)) * TILE;

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.uri }}
          style={[styles.tile, { left: tile.left, top: tile.top }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setUseEsri(true)}
        />
      ))}
      {size.width > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.pin,
            {
              left: pinLeft - 18,
              top: pinTop - 36,
            },
          ]}
        >
          <Ionicons name="location" size={36} color={Connex.accent} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#d5dde4',
  },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
  },
  pin: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
  },
});
