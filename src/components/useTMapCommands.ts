import {useRef} from 'react';
import {findNodeHandle, UIManager} from 'react-native';

export function useTMapCommands() {
  const ref = useRef<any>(null);

  const dispatch = (command: string, args: any[] = []) => {
    const node = findNodeHandle(ref.current);
    if (!node) {
      return;
    }

    const config = (UIManager as any).getViewManagerConfig('SKTTMapView');
    const commandId = config.Commands[command];
    UIManager.dispatchViewManagerCommand(node, commandId, args);
  };

  return {
    ref,
    // TMap native animateTo expects [lon, lat, zoom]. Keep signature (lat, lon)
    // for caller readability but swap order when dispatching.
    animateTo: (lat: number, lon: number, zoom: number = 15) =>
      dispatch('animateTo', [lon, lat, zoom]),

    addMarker: (lat: number, lon: number, title: string) =>
      dispatch('addMarker', [lat, lon, title]),

    addMarkerWithIcon: (
      lat: number,
      lon: number,
      title: string,
      iconName: string,
      accessibilityLabel?: string,
    ) =>
      dispatch('addMarkerWithIcon', [
        lat,
        lon,
        title,
        iconName,
        accessibilityLabel || title,
      ]),

    addPolyline: (points: {lat: number; lon: number}[]) => {
      const coords = points.map(p => [p.lon, p.lat]);
      dispatch('addPolyline', [coords]);
    },

    /** ✅ 핵심 수정 */
    clear: () => {
      dispatch('clear');
    },
  };
}
