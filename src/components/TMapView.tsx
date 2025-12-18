import {
  requireNativeComponent,
  ViewProps,
  NativeSyntheticEvent,
} from 'react-native';
import {forwardRef} from 'react';

type PressEvent = NativeSyntheticEvent<{lat: number; lon: number}>;

export interface TMapViewProps extends ViewProps {
  appKey: string;
  centerLat?: number;
  centerLon?: number;
  zoomLevel?: number;
  onMapReady?: () => void;
  onPress?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
}

const SKTTMapViewNative = requireNativeComponent<TMapViewProps>('SKTTMapView');

export default forwardRef<any, TMapViewProps>(function TMapView(props, ref) {
  return (
    <SKTTMapViewNative ref={ref} {...props} style={[{flex: 1}, props.style]} />
  );
});
