import { useRef } from "react";
import { findNodeHandle, UIManager } from "react-native";

export function useTMapCommands() {
  const ref = useRef<any>(null);

  const dispatch = (command: string, args: any[] = []) => {
    const node = findNodeHandle(ref.current);
    if (!node) return;

    const commandConfig = (UIManager as any).getViewManagerConfig("SKTTMapView");
    const commandId = commandConfig.Commands[command];

    if (commandId === undefined) {
      console.warn(`❌ Command not found: ${command}`);
      return;
    }

    UIManager.dispatchViewManagerCommand(node, commandId, args);
  };

  return {
    ref,

    animateTo: (lat: number, lon: number, zoom: number = 15) =>
      dispatch("animateTo", [lat, lon, zoom]),

    addMarker: (lat: number, lon: number, title: string) =>
      dispatch("addMarker", [lat, lon, title]),

    addPolyline: (points: { lat: number; lon: number }[]) => {
      const coords = points.map((p) => [p.lon, p.lat]);
      dispatch("addPolyline", [coords]);
    },

    // ⭐ 내 위치 마커 업데이트 — 항상 동일 ID로 보내기
    addOrMoveMarker: (lat: number, lon: number, id: string = "my-location") =>
      dispatch("addOrMoveMarker", [lat, lon, id]),
  };
}
