// src/components/TMapView.tsx
import { requireNativeComponent, ViewProps, NativeSyntheticEvent } from 'react-native';

type PressEv = NativeSyntheticEvent<{ lat: number; lon: number }>;

type Props = ViewProps & {
  apiKey: string;
  centerLat?: number;
  centerLon?: number;
  zoomLevel?: number;
  onMapReady?: () => void;
  onPress?: (e: PressEv) => void;
  onLongPress?: (e: PressEv) => void;
};

export default requireNativeComponent<Props>('SKTTMapView');
