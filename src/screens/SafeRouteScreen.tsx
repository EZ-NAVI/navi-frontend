import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import TMapView from "../components/TMapView";
import { useTMapCommands } from "../components/useTMapCommands";
import { useRouteData } from "../context/RouteContext";
import { fetchPreviewRoute } from "../api/routes";
import SafetyNoticeModal from "../components/SafetyNoticeModal";

export default function SafeRouteScreen() {
  const navigation = useNavigation<any>();
  const { start, end } = useRouteData();
  const map = useTMapCommands();
  const [isReady, setIsReady] = useState(false);
  // 제보하기 버튼 상태
  const [safetyOpen, setSafetyOpen] = useState(false);

  useEffect(() => {
    if (!isReady || !map.ref.current) return;

    // ✅ 출발지 & 도착지 마커 표시
    if (start) {
      map.addMarker(start.lat, start.lon, "출발지");
      map.animateTo(start.lat, start.lon, 16);
    }
    if (end) {
      map.addMarker(end.lat, end.lon, "도착지");
    }

    // ✅ 출발지+도착지 설정 완료 시 API 호출
    const fetchRoute = async () => {
      if (start && end) {
        try {
          console.log("🚀 API 요청:", start, "→", end);
          const route = await fetchPreviewRoute({
            origin_lat: start.lat,
            origin_lng: start.lon,
            dest_lat: end.lat,
            dest_lng: end.lon,
          });

          console.log("📦 /routes/preview 응답:", route);

          if (route?.path?.length > 0) {
            const pathCoords = route.path.map((p: any) => ({
              lat: p.lat,
              lon: p.lon,
            }));

            // ✅ addPolyline 구조 수정됨
            map.addPolyline(pathCoords);

            const middle = pathCoords[Math.floor(pathCoords.length / 2)];
            map.animateTo(middle.lat, middle.lon, 15);
          } else {
            Alert.alert("경로를 찾을 수 없습니다.");
          }
        } catch (err) {
          console.error("❌ 경로 요청 실패:", err);
          Alert.alert("서버 연결 실패", "잠시 후 다시 시도해주세요.");
        }
      }
    };

    fetchRoute();
  }, [start, end, isReady]);

  // (더이상 애니메이션 토글 필요 없음)

  return (
    <View style={styles.container}>
      <TMapView
        ref={map.ref}
        style={styles.map}
        apiKey="JT4qeFOp7e438Wx4rsj419607dvmdw3X3SOhcBKy"
        zoomLevel={15}
        centerLat={37.5665}
        centerLon={126.9780}
        onMapReady={() => {
          console.log("🗺️ 지도 로드 완료!");
          setIsReady(true);
        }}
      />

      {/* 화면 하단에 항상 보이는 긴 제보 버튼 (맵 위에 고정) */}
      <View style={extraStyles.longReportWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={extraStyles.longReportButton}
          onPress={() => {
            setSafetyOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="긴 제보하기 버튼"
        >
          <Text style={extraStyles.longReportText}>제보하기</Text>
        </TouchableOpacity>
      </View>

      <SafetyNoticeModal
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        onConfirm={() => {
          setSafetyOpen(false);
          // TODO: ReportModal 혹은 네비게이션으로 연결
        }}
      />

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
            <Text style={styles.label}>출발지 :</Text>
            <Text style={styles.value}>{start ? start.name : ""}</Text>
            {!start && (
              <Icon
                name="search-outline"
                size={18}
                color="#555"
                style={styles.icon}
              />
            )}
          </TouchableOpacity>

          <View style={styles.line} />

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("LocationSearch", { type: "end" })
            }
          >
            <Text style={styles.circle}>●</Text>
            <Text style={styles.label}>도착지 :</Text>
            <Text style={styles.value}>{end ? end.name : ""}</Text>
            {!end && (
              <Icon
                name="search-outline"
                size={18}
                color="#555"
                style={styles.icon}
              />
            )}
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
    backgroundColor: "#ffffff",
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f7d23e",
    letterSpacing: 1,
    marginBottom: 6,
  },
  topCard: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  circle: { fontSize: 10, color: "#333", marginRight: 4, marginTop: 2 },
  label: { fontSize: 15, fontWeight: "600", color: "#333", marginRight: 4 },
  value: { color: "#111", flex: 1 },
  line: { height: 1, backgroundColor: "#e0e0e0", marginHorizontal: 10 },
  icon: { marginLeft: "auto" },
});

// 하단 플로팅 버튼 스타일
const extraStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.select({ android: 24, ios: 34 }),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E9C74E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  longReportWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.select({ android: 24, ios: 34 }),
    alignItems: 'stretch',
  },
  longReportButton: {
    backgroundColor: '#E9C74E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    justifyContent: 'center',
    alignItems: 'center',
  },
  longReportText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});

// Merge extraStyles into styles object by spreading when used
