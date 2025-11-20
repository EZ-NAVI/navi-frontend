// SafeRouteScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import TMapView from "../components/TMapView";
import { useTMapCommands } from "../components/useTMapCommands";
import { useRouteData } from "../context/RouteContext";

import { fetchPreviewRoute, saveRoute } from "../api/routes";
import { evaluateRoute } from "../api/evaluateRoute";

import { startTracking, stopTracking } from "../utils/locationTracker";
import { haversine } from "../utils/haversine";

import RouteRatingModal from "../components/RouteRatingModal";

export default function SafeRouteScreen() {
  const navigation = useNavigation<any>();
  const { start, end } = useRouteData();
  const map = useTMapCommands();

  const [isReady, setIsReady] = useState(false);
  const didInit = useRef(false);
  const [autoReload, setAutoReload] = useState(true);

  const [routeId, setRouteId] = useState<string | null>(null);

  const [userPositions, setUserPositions] = useState<any[]>([]);
  const reachedRef = useRef(false);

  const [showRating, setShowRating] = useState(false);

  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const routePathRef = useRef<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setAutoReload(false), 100);
    return () => clearTimeout(t);
  }, []);

  /* 1) 첫 지도 로딩 */
  useEffect(() => {
    if (!isReady || !map.ref.current) return;
    if (didInit.current) return;
    didInit.current = true;

    if (start) map.addMarker(start.lat, start.lon, "출발지");
    if (end) map.addMarker(end.lat, end.lon, "도착지");

    if (start && end) fetchRouteAndDraw();
  }, [isReady]);

  /* 2) 출발/도착 변경 시 */
  useEffect(() => {
    if (!isReady || !map.ref.current) return;

    if (start) map.addMarker(start.lat, start.lon, "출발지");
    if (end) map.addMarker(end.lat, end.lon, "도착지");

    if (start && end) fetchRouteAndDraw();
  }, [start, end]);

  /* 3) preview route */
  const fetchRouteAndDraw = async () => {
    if (!start || !end) return;

    try {
      const route = await fetchPreviewRoute({
        origin_lat: start.lat,
        origin_lng: start.lon,
        dest_lat: end.lat,
        dest_lng: end.lon,
      });

      if (!route?.path) {
        Alert.alert("경로를 찾을 수 없습니다.");
        return;
      }

      setRouteId(null);

      const coords = route.path.map((p: any) => ({
        lat: p.lat,
        lon: p.lon,
      }));

      routePathRef.current = coords;

      map.addPolyline(coords);

      const mid = coords[Math.floor(coords.length / 2)];
      map.animateTo(mid.lat, mid.lon, 15);

      reachedRef.current = false;
      startTracking(setUserPositions);
    } catch (err) {
      console.log("❌ preview 실패:", err);
    }
  };

  /* 4) GPS 변화 + 도착 감지 */
  useEffect(() => {
    if (userPositions.length === 0) return;

    const latest = userPositions[userPositions.length - 1];
    setCurrentPosition({ lat: latest.lat, lon: latest.lon });

    if (!end) return;

    const distToDest = haversine(latest.lat, latest.lon, end.lat, end.lon);
    console.log(`🧭 목적지까지 거리: ${distToDest.toFixed(1)}m`);

    if (reachedRef.current) return;

    if (distToDest <= 40) {
      console.log("🎉 목적지 도착!");
      reachedRef.current = true;
      stopTracking();
      saveRouteToServer();
    }
  }, [userPositions]);

  /* ⭐ 내 위치 마커 기능 완전 제거 — 아래 두 useEffect 삭제됨 */

  /* 6) 서버에 route 저장 */
  const saveRouteToServer = async () => {
    if (!start || !end || userPositions.length < 2) {
      console.log("⚠ route 저장 불가");
      return;
    }

    type PathPoint = { lat: number; lon: number; timestamp: number };
    const path_data: PathPoint[] = [];

    for (let i = 0; i < userPositions.length; i++) {
      const p = userPositions[i];
      const ts =
        typeof p.timestamp === "number" && Number.isFinite(p.timestamp)
          ? p.timestamp
          : Date.now();

      const point: PathPoint = { lat: p.lat, lon: p.lon, timestamp: ts };

      const last = path_data[path_data.length - 1];
      if (last && last.lat === point.lat && last.lon === point.lon) continue;

      path_data.push(point);
    }

    if (path_data.length < 2) {
      console.log("⚠ path_data 부족");
      return;
    }

    const startTime = path_data[0].timestamp;
    const endTime = path_data[path_data.length - 1].timestamp;
    let durationSec = Math.floor((endTime - startTime) / 1000);
    if (!Number.isFinite(durationSec) || durationSec < 0) durationSec = 0;

    const payload = {
      origin_lat: start.lat,
      origin_lng: start.lon,
      dest_lat: end.lat,
      dest_lng: end.lon,
      duration: durationSec,
      path_data,
    };

    try {
      const res = await saveRoute(payload);
      setRouteId(res.routeId);
      setShowRating(true);
    } catch (err) {
      console.log("❌ 경로 저장 실패:", err);
    }
  };

  /* 7) 평가 제출 */
  const handleSubmitRating = (rating: number) => {
    if (!routeId) {
      console.log("❌ routeId 없음 → 평가 불가");
      return;
    }

    evaluateRoute(routeId, Number(rating))
      .then(() => console.log("⭐ 평가 저장 성공"))
      .catch(() => console.log("❌ 평가 저장 실패"));
  };

  return (
    <View style={styles.container}>
      <RouteRatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleSubmitRating}
      />

      {!autoReload && (
        <TMapView
          ref={map.ref}
          style={styles.map}
          apiKey="JT4qeFOp7e438Wx4rsj419607dvmdw3X3SOhcBKy"
          zoomLevel={15}
          centerLat={37.5665}
          centerLon={126.978}
          onMapReady={() => setTimeout(() => setIsReady(true), 80)}
        />
      )}

      <View style={styles.topSection}>
        <Text style={styles.logo}>NAVI</Text>

        <View style={styles.topCard}>
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("LocationSearch", { type: "start" })
            }
          >
            <Text style={styles.circle}>●</Text>
            <Text style={styles.label}> 출발지 :</Text>
            <Text style={styles.value}>{start?.name}</Text>
          </TouchableOpacity>

          <View style={styles.line} />

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("LocationSearch", { type: "end" })
            }
          >
            <Text style={styles.circle}>●</Text>
            <Text style={styles.label}> 도착지 :</Text>
            <Text style={styles.value}>{end?.name}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  topSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 20,
    elevation: 4,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f7d23e",
    marginBottom: 6,
  },
  topCard: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    paddingVertical: 6,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 12 },
  circle: { fontSize: 10, color: "#F4C400", marginRight: 4, marginTop: 2 },
  label: { fontSize: 15, fontWeight: "600", color: "#333" },
  value: { flex: 1, color: "#000" },
  line: { height: 1, backgroundColor: "#ddd", marginHorizontal: 10 },
});
