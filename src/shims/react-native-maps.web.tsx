import { Component, createElement, type ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type LatLng = {
  latitude: number;
  longitude: number;
};

type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  region?: Region;
  provider?: string;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  children?: ReactNode;
};

type MapViewState = {
  region?: Region;
};

export default class MapView extends Component<MapViewProps, MapViewState> {
  state: MapViewState = {
    region: this.props.initialRegion ?? this.props.region,
  };

  animateToRegion(region: Region, _duration?: number) {
    this.setState({ region });
  }

  render() {
    const region = this.state.region ?? this.props.initialRegion ?? this.props.region;
    const latitude = region?.latitude ?? 17.385;
    const longitude = region?.longitude ?? 78.4867;

    return (
      <View style={this.props.style}>
        {createElement('iframe', {
          src: `https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`,
          style: { width: '100%', height: '100%', border: 0 },
          title: 'Map',
        })}
      </View>
    );
  }
}

export function Marker(_props: { coordinate: LatLng; pinColor?: string }) {
  return null;
}

export const PROVIDER_GOOGLE = 'google';
