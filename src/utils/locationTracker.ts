// src/utils/locationTracker.ts
import { PermissionsAndroid, Platform } from "react-native";
import type { Dispatch, SetStateAction } from 'react';
import Geolocation from "react-native-geolocation-service";

let intervalId: ReturnType<typeof setInterval> | null = null;

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

export const startTracking = async (setPositions: Dispatch<SetStateAction<any[]>>) => {
  const ok = await requestLocationPermission();
  if (!ok) return;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  console.log("🛰 GPS 추적 시작");

  intervalId = setInterval(() => {
    Geolocation.getCurrentPosition(
      (position: any) => {
        const { latitude, longitude } = position.coords;
        console.log("📍 위치 업데이트:", latitude, longitude);

        setPositions((prev: any[]) => {
          const last = prev[prev.length - 1];

          // ⭐ 이전 좌표와 동일하면 저장하지 않음 (GPS 튐 방지)
          if (last && last.lat === latitude && last.lon === longitude) {
            return prev;
          }

          return [
            ...prev,
            {
              lat: latitude,
              lon: longitude,
              timestamp: position.timestamp,
            },
          ];
        });
      },
      (err: any) => {
        console.warn("GPS Error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        forceRequestLocation: true,   // ⭐ 계속 최신 위치 요청
        showLocationDialog: true
      }
    );
  }, 1200);
};

export const stopTracking = () => {
  console.log("🛑 GPS 추적 종료");
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
