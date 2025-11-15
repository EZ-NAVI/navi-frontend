import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import TMapView from "../components/TMapView";
import { useTMapCommands } from "../components/useTMapCommands";
import { useRouteData } from "../context/RouteContext";
import { fetchPreviewRoute } from "../api/routes";

// GPS 추적 관련
import { startTracking, stopTracking } from "../utils/locationTracker";
import { haversine } from "../utils/haversine";

// ⭐ 평가 모달
import RouteRatingModal from "../components/RouteRatingModal";
import { evaluateRoute } from "../api/evaluateRoute";

export default function SafeRouteScreen() {
  const navigation = useNavigation<any>();
  const { start, end } = useRouteData();
  const map = useTMapCommands();

  const [isReady, setIsReady] = useState(false);
  const didInit = useRef(false);

  const [autoReload, setAutoReload] = useState(true);

  // ⭐ 모달 on/off
  const [showRating, setShowRating] = useState(false);

  // ⭐ 서버에서 받은 route_id 저장
  const [routeId, setRouteId] = useState<string | null>(null);

  // ⭐ 실제 사용자 GPS 이동 기록
  const [userPositions, setUserPositions] = useState<any[]>([]);

  // ⭐ 경로 polyline 저장
  const [routePath, setRoutePath] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setAutoReload(false), 100);
    return () => clearTimeout(t);
  }, []);

  /** -------------------------------
   * 1) 지도 최초 로딩
   -------------------------------- */
  useEffect(() => {
    if (!isReady || !map.ref.current) return;
    if (didInit.current) return;
    didInit.current = true;

    if (start) map.addMarker(start.lat, start.lon, "출발지");
    if (end) map.addMarker(end.lat, end.lon, "도착지");

    if (start && end) fetchRouteAndDraw();
  }, [isReady]);

  /** -------------------------------
   * 2) 출발/도착 변경 시 경로 다시 로딩
   -------------------------------- */
  useEffect(() => {
    if (!isReady || !map.ref.current) return;
    if (start) map.addMarker(start.lat, start.lon, "출발지");
    if (end) map.addMarker(end.lat, end.lon, "도착지");

    if (start && end) fetchRouteAndDraw();
  }, [start, end]);

  /** -------------------------------
   * 3) 서버 API로 경로 받아오기
   -------------------------------- */
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

      // 서버 route_id 저장
      setRouteId(route.route_id);

      const coords = route.path.map((p: any) => ({
        lat: p.lat,
        lon: p.lon,
      }));

      setRoutePath(coords);
      map.addPolyline(coords);

      // 중앙으로 이동
      const mid = coords[Math.floor(coords.length / 2)];
      map.animateTo(mid.lat, mid.lon, 15);

      // ⭐ GPS 추적 시작
      startTracking(setUserPositions);
    } catch (err) {
      console.log("❌ 경로 로딩 실패:", err);
    }
  };

  /** -------------------------------
   * 4) GPS 변화 감지 → 목적지 20m 이내 도착하면 모달 표시
   -------------------------------- */
  useEffect(() => {
    if (!end) return;
    if (!routeId) return;

    if (userPositions.length < 3) return;

    const last = userPositions[userPositions.length - 1];

    const dist = haversine(last.lat, last.lon, end.lat, end.lon);

    if (dist < 20) {
      console.log("🎉 목적지 도착!");

      stopTracking();
      setShowRating(true); // ⭐ 자동으로 모달 열기
    }
  }, [userPositions]);

  /** -------------------------------
   * 5) 평가 제출
   -------------------------------- */
  const handleSubmitRating = (rating: number) => {
    if (!routeId) return;

    evaluateRoute(routeId, rating)
      .then(() => console.log("⭐ 평가 저장 성공"))
      .catch(() => console.log("❌ 평가 저장 실패"));
  };

  return (
    <View style={styles.container}>
      {/* ⭐ 평가 모달 */}
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
          centerLon={126.9780}
          onMapReady={() => setTimeout(() => setIsReady(true), 80)}
        />
      )}

      {/* 상단 UI 그대로 유지 */}
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
            {!start && <Icon name="search-outline" size={18} color="#555" />}
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
            {!end && <Icon name="search-outline" size={18} color="#555" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },

  // === 상단 UI ===
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
