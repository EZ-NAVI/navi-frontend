import { useRef } from "react";
import { findNodeHandle, UIManager } from "react-native";

export function useTMapCommands() {
  const ref = useRef(null);

  const animateTo = (lat: number, lon: number, zoom: number) => {
    UIManager.dispatchViewManagerCommand(
      findNodeHandle(ref.current),
      UIManager.getViewManagerConfig("SKTTMapView").Commands.animateTo,
      [lat, lon, zoom]
    );
  };

  const addMarker = (lat: number, lon: number, title: string) => {
    UIManager.dispatchViewManagerCommand(
      findNodeHandle(ref.current),
      UIManager.getViewManagerConfig("SKTTMapView").Commands.addMarker,
      [lat, lon, title]
    );
  };

  const addRoute = (startLat: number, startLon: number, endLat: number, endLon: number) => {
    UIManager.dispatchViewManagerCommand(
      findNodeHandle(ref.current),
      UIManager.getViewManagerConfig("SKTTMapView").Commands.addRoute,
      [startLat, startLon, endLat, endLon]
    );
  };

  return { ref, animateTo, addMarker, addRoute };
}
