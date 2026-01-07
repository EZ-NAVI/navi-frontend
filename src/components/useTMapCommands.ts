import { useRef } from "react";
import { findNodeHandle, UIManager } from "react-native";

export function useTMapCommands() {
  const ref = useRef<any>(null);

  // Helper: 명령 실행
  const dispatch = (command: string, args: any[] = []) => {
    const node = findNodeHandle(ref.current);
    if (!node) return;
    const commandId =
      (UIManager as any).getViewManagerConfig("SKTTMapView").Commands[command];
    UIManager.dispatchViewManagerCommand(node, commandId, args);
  };

  return {
    ref,
    animateTo: (lat: number, lon: number, zoom: number = 15) =>
      dispatch("animateTo", [lat, lon, zoom]),
    addMarker: (lat: number, lon: number, title: string) =>
      dispatch("addMarker", [lat, lon, title]),
    addMarkerWithIcon: (
      lat: number,
      lon: number,
      title: string,
      iconName: string,
      accessibilityLabel?: string
    ) => dispatch("addMarkerWithIcon", [lat, lon, title, iconName, accessibilityLabel || title]),
    addPolyline: (points: { lat: number; lon: number }[]) => {
      // ✅ Kotlin 쪽 args.getArray(0) 대응을 위해 [ [lon, lat], [lon, lat], ... ] 형태로 전달
      const coords = points.map((p) => [p.lon, p.lat]);
      dispatch("addPolyline", [coords]);
    },
  };
}
