// src/utils/locationTracker.ts
import Geolocation from "react-native-geolocation-service";
import { PermissionsAndroid, Platform } from "react-native";

let watchId: number | null = null;

export async function requestLocationPermission() {
  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "위치 권한 필요",
        message: "안전 경로 안내를 위해 위치 권한이 필요합니다.",
        buttonPositive: "허용",
        buttonNegative: "거부",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export const startTracking = async (setPositions: (pos: any) => void) => {
  const ok = await requestLocationPermission();
  if (!ok) return;

  watchId = Geolocation.watchPosition(
    (position) => {
      setPositions((prev: any[]) => [
        ...prev,
        {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          timestamp: position.timestamp,
        },
      ]);
    },
    (err) => console.warn("GPS Error:", err),
    {
      enableHighAccuracy: true,
      distanceFilter: 1,
      interval: 2000,
      fastestInterval: 1000,
    }
  );
};

export const stopTracking = () => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
  }
};
