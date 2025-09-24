import React, { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import TMapView from "./src/components/TMapView";
import { useTMapCommands } from "./src/components/useTMapCommands";

export default function App() {
  const map = useTMapCommands();
  const [start, setStart] = useState<{lat:number, lon:number} | null>(null);
  const [end, setEnd] = useState<{lat:number, lon:number} | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <TMapView
        ref={map.ref}
        style={styles.map}
        apiKey="JT4qeFOp7e438Wx4rsj419607dvmdw3X3SOhcBKy"
        centerLat={37.5665}
        centerLon={126.9780}
        zoomLevel={15}
        onMapReady={() => {
          console.log("✅ Map Ready");
        }}
        onPress={(e) => {
          const { lat, lon } = e.nativeEvent;

          if (!start) {
            // 첫 번째 클릭 → 출발지
            setStart({ lat, lon });
            setEnd(null);
            map.addMarker(lat, lon, "출발지");
          } else if (!end) {
            // 두 번째 클릭 → 도착지 + 경로 표시
            setEnd({ lat, lon });
            map.addMarker(lat, lon, "도착지");
            map.addRoute(start.lat, start.lon, lat, lon);
          } else {
            // 세 번째 클릭 → 다시 출발지부터
            setStart({ lat, lon });
            setEnd(null);
            map.addMarker(lat, lon, "출발지");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 }
});
