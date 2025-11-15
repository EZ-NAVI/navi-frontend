import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import TMapView from "../components/TMapView";
import { useTMapCommands } from "../components/useTMapCommands";
import { useRouteData } from "../context/RouteContext";
import { fetchPreviewRoute } from "../api/routes";
import SafetyNoticeModal from "../components/SafetyNoticeModal";
import ReportModal from "../components/ReportModal";
import { fetchReports, fetchReportById, fetchReportComments, postReportComment } from "../api/reports";
import ClusterReportsScreen from "./ClusterReportsScreen";
import { Modal, PanResponder, Animated, Dimensions } from 'react-native';

export default function SafeRouteScreen() {
  const navigation = useNavigation<any>();
  const { start, end } = useRouteData();
  const map = useTMapCommands();
  const [isReady, setIsReady] = useState(false);
  const [reportsData, setReportsData] = useState<any[]>([]);
  // 제보하기 버튼 상태
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLocation, setReportLocation] = useState<any | undefined>(undefined);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newComment, setNewComment] = useState<string>('');
  const [postingComment, setPostingComment] = useState(false);
  const [clusterListOpen, setClusterListOpen] = useState(false);
  const [clusterIdForList, setClusterIdForList] = useState<string | number | null>(null);
  const [clusterNearbyReports, setClusterNearbyReports] = useState<any[] | null>(null);

  // Try to derive cluster id from a report object or by matching coordinates against loaded reportsData
  const resolveClusterId = (report: any): string | null => {
    if (!report) return null;
    const possible = report.clusterId ?? report.cluster_id ?? report.cluster?.id ?? report.cluster?.cluster_id ?? report.cluster_id;
    if (possible) return String(possible);

    // try matching by coordinates against reportsData
    const rlat = Number(report.locationLat ?? report.location_lat ?? report.__lat ?? report.lat ?? report.latitude ?? 0);
    const rlon = Number(report.locationLng ?? report.location_lng ?? report.__lon ?? report.lon ?? report.longitude ?? 0);
    if (!rlat || !rlon) return null;

    // find closest in reportsData within small threshold (meters)
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadius = 6371000;
    let best: any = null;
    let bestDist = Infinity;
    for (const r of reportsData) {
      const lat2 = Number(r.locationLat ?? r.location_lat ?? r.__lat ?? r.lat ?? r.latitude ?? 0);
      const lon2 = Number(r.locationLng ?? r.location_lng ?? r.__lon ?? r.lon ?? r.longitude ?? 0);
      if (!lat2 || !lon2) continue;
      const dLat = toRad(lat2 - rlat);
      const dLon = toRad(lon2 - rlon);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(rlat)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = earthRadius * c;
      if (d < bestDist) { bestDist = d; best = r; }
    }

    // threshold 100m
    if (best && bestDist <= 100) {
      const pc = best.clusterId ?? best.cluster_id ?? best.cluster?.id ?? best.cluster?.cluster_id ?? best.cluster_id;
      if (pc) return String(pc);
    }

    return null;
  };

  // animated pan for bottom detail modal drag-to-expand
  const screenHeight = Dimensions.get('window').height;
  // collapsed height for the bottom modal (px) — adjust for desired initial size
  const COLLAPSED_HEIGHT = 300;
  const MAX_HEIGHT = Math.round(screenHeight * 0.9);
  const modalHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        // nothing special required here for height-based interaction
      },
      onPanResponderMove: (_evt, gs) => {
        // user drags up: dy is negative; we want to increase height accordingly
        const desired = Math.round(Math.max(COLLAPSED_HEIGHT, Math.min(MAX_HEIGHT, COLLAPSED_HEIGHT - gs.dy)));
        modalHeight.setValue(desired);
      },
      onPanResponderRelease: (_evt, gs) => {
        // decide whether to open full list
        modalHeight.stopAnimation((value: number) => {
          const shouldOpen = value > screenHeight * 0.5 || gs.vy < -0.8;
          if (shouldOpen) {
            // animate to full height then open cluster list
            Animated.timing(modalHeight, { toValue: MAX_HEIGHT, duration: 220, useNativeDriver: false }).start(() => {
              const cid = resolveClusterId(selectedReport);
              if (cid) {
                setClusterIdForList(String(cid));
                setClusterNearbyReports(null);
                setDetailOpen(false);
                setClusterListOpen(true);
                // reset height for next open
                modalHeight.setValue(COLLAPSED_HEIGHT);
                return;
              }

              // Fallback: try to find nearby reports within 100m and show them
              try {
                const sr = selectedReport as any;
                const rlat = Number(sr.locationLat ?? sr.location_lat ?? sr.__lat ?? sr.lat ?? sr.latitude ?? 0);
                const rlon = Number(sr.locationLng ?? sr.location_lng ?? sr.__lon ?? sr.lon ?? sr.longitude ?? 0);
                if (rlat && rlon && Array.isArray(reportsData) && reportsData.length > 0) {
                  const toRad = (deg: number) => (deg * Math.PI) / 180;
                  const earthRadius = 6371000;
                  const nearby: any[] = [];
                  for (const r of reportsData) {
                    const lat2 = Number(r.locationLat ?? r.location_lat ?? r.__lat ?? r.lat ?? r.latitude ?? 0);
                    const lon2 = Number(r.locationLng ?? r.location_lng ?? r.__lon ?? r.lon ?? r.longitude ?? 0);
                    if (!lat2 || !lon2) continue;
                    const dLat = toRad(lat2 - rlat);
                    const dLon = toRad(lon2 - rlon);
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(rlat)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const d = earthRadius * c;
                    if (d <= 100) nearby.push(r);
                  }

                  if (nearby.length > 0) {
                    setClusterNearbyReports(nearby);
                    // use a placeholder cluster id
                    setClusterIdForList('nearby');
                    setDetailOpen(false);
                    setClusterListOpen(true);
                    modalHeight.setValue(COLLAPSED_HEIGHT);
                    return;
                  }
                }
              } catch (e) {
                console.warn('nearby fallback failed', e);
              }

              // if still nothing, inform user and revert height
              Alert.alert('클러스터 정보 없음', '이 제보에 대한 클러스터 ID가 없습니다.');
              Animated.timing(modalHeight, { toValue: COLLAPSED_HEIGHT, duration: 200, useNativeDriver: false }).start();
            });
          } else {
            // snap back to collapsed
            Animated.spring(modalHeight, { toValue: COLLAPSED_HEIGHT, useNativeDriver: false, bounciness: 8 }).start();
          }
        });
      },
    })
  ).current;

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

  // 지도가 준비되면 전체 제보를 불러와서 마커로 표시합니다.
  useEffect(() => {
    if (!isReady || !map.ref.current) return;

    const loadReports = async () => {
      try {
        // 개발용 임시 토큰 바꿔!!!!!
        const DEV_TOKEN =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLN1Y2UzFEV0tLTjFXOTJZMVg3WU05NEQiLCJ1c2VyX3R5cGUiOiJwYXJlbnQiLCJyb2xlIjoiVVNFUiIsImV4cCI6MTc2MzA1NjMzMn0.ojDYW6wd5sOhoAEMH7eOT_OaVZn2XJ4UIcXaTPTpXbE";

        // 우선 AsyncStorage에 토큰이 있는지 확인하고, 없으면 개발용 토큰을 사용합니다.
        let tokenToUse: string | null = null;
        try {
          tokenToUse = await AsyncStorage.getItem('access_token');
        } catch (e) {
          console.warn('AsyncStorage read failed', e);
        }
        if (!tokenToUse) tokenToUse = __DEV__ ? DEV_TOKEN : null;

        const reports = await fetchReports(tokenToUse ?? undefined);
        console.log("📍 전체 제보 불러옴:", reports);

        if (Array.isArray(reports)) {
          setReportsData(reports);
          const validReports: any[] = [];
          reports.forEach((r: any) => {
            // 응답 샘플에 따르면 필드명이 camelCase로 제공됩니다.
            const lat =
              r.locationLat ?? r.location_lat ?? r.lat ?? r.latitude ?? null;
            const lon =
              r.locationLng ?? r.location_lng ?? r.lon ?? r.longitude ?? null;

            // 0,0 좌표는 무시
            if (!lat || !lon || (lat === 0 && lon === 0)) return;

            validReports.push({ ...r, __lat: Number(lat), __lon: Number(lon) });
          });

          // 디버그 로그: 불러온 유효 제보
          console.log(`🔎 유효 제보 수: ${validReports.length}`, validReports.map((p) => ({ id: p.reportId ?? p.id, lat: p.__lat, lon: p.__lon })));

          // 마커 추가
          // 준비된 로컬 에셋을 resolve해서 네이티브로 전달
          let assetUri: string | undefined;
          try {
            // 프로젝트 내 src/asset/good_ping.png 을 require로 불러와 에셋 URI를 얻습니다.
            const resolved = Image.resolveAssetSource(require("../asset/good_ping.png"));
            assetUri = resolved?.uri;
            console.log("🔧 resolved asset uri:", assetUri);
          } catch (e) {
            console.warn("에셋 resolve 실패, drawable name 사용 예정:", e);
          }

          validReports.forEach((r: any) => {
            const title = r.category ?? r.description ?? "제보";
            try {
              console.log("➕ 마커 추가 시도:", r.__lat, r.__lon, title);
              if (assetUri && (map as any).addMarkerWithIcon) {
                (map as any).addMarkerWithIcon(r.__lat, r.__lon, title, assetUri);
              } else {
                // fall back to default marker provided by the native map
                map.addMarker(r.__lat, r.__lon, title);
              }
            } catch (e) {
              console.warn("마커 추가 실패", e);
            }
          });

          // 첫 번째 유효 제보 위치로 카메라 이동(개발 편의)
          if (validReports.length > 0) {
            const first = validReports[0];
            try {
              map.animateTo(first.__lat, first.__lon, 15);
            } catch (e) {
              console.warn("초기 제보 위치로 이동 실패", e);
            }
          }
        }
      } catch (err) {
        console.warn("/reports 조회 실패:", err);
      }
    };

    loadReports();
  }, [isReady]);

  // 보고된 제보 리스트에서 항목을 탭하면 지도로 이동
  const onSelectReport = (item: any) => {
    const lat = item.locationLat ?? item.location_lat ?? item.lat ?? item.latitude;
    const lon = item.locationLng ?? item.location_lng ?? item.lon ?? item.longitude;
    if (!lat || !lon || (lat === 0 && lon === 0)) return;
    try {
      map.animateTo(lat, lon, 17);
    } catch (e) {
      console.warn("지도 이동 실패", e);
    }
  };

  // 마커를 탭했을 때 실행: reportId로 상세 조회 후 하단 모달을 연다
  const onMarkerPress = async (report: any) => {
    const reportId = report.reportId ?? report.id;
    if (!reportId) return;
    setLoadingDetail(true);
    try {
      // try to use stored token or dev token in dev mode
      let tokenToUse: string | null = null;
      try { tokenToUse = await AsyncStorage.getItem('access_token'); } catch (e) { console.warn('token read failed', e); }
      if (!tokenToUse && __DEV__) tokenToUse = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLOUtDV0o5UjNIUFMyOFI4WDBKVFlTSFAiLCJ1c2VyX3R5cGUiOiJjaGlsZCIsInJvbGUiOiJVU0VSIiwiZXhwIjoxNzYyNzA2MzA2fQ.-SQQv889CeTroepb1PBst2Cb3p3NTBI2bF-Pi992j9Q";

      const detail = await fetchReportById(String(reportId), tokenToUse ?? undefined);
      // Try to fetch comments for this report; non-fatal if it fails.
      try {
        const comments = await fetchReportComments(String(reportId), tokenToUse ?? undefined);
        // attach comments in normalized shape
        detail.comments = Array.isArray(comments) ? comments : (comments ? [comments] : []);
      } catch (e) {
        console.warn('댓글 불러오기 실패', e);
        detail.comments = detail.comments ?? [];
      }
      setSelectedReport(detail);
      setDetailOpen(true);
    } catch (e) {
      console.warn('/reports/{id} 조회 실패', e);
      Alert.alert('제보 불러오기 실패', '서버에서 제보를 불러오지 못했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // 개발 편의: 토큰을 강제로 설정하는 버튼 (dev 전용)
  const setDevToken = async () => {
    const DEV_TOKEN =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLOE1UQUNKMkFaU043WjdFWjFDN1ZFOEEiLCJ1c2VyX3R5cGUiOiJjaGlsZCIsInJvbGUiOiJVU0VSIiwiZXhwIjoxNzYyODY3NzIxfQ.So1xEoa9TbDutV78yvhZHqzRdoXvFN45hgzk0lGxqGk";
    try {
      await AsyncStorage.setItem('access_token', DEV_TOKEN);
      if (Platform.OS === 'android') {
        // eslint-disable-next-line no-undef
        const ToastAndroid = require('react-native').ToastAndroid;
        ToastAndroid.show('Dev token 저장됨', ToastAndroid.SHORT);
      } else {
        Alert.alert('Dev token 저장됨');
      }
      console.log('Dev token set in AsyncStorage');
    } catch (e) {
      console.warn('Dev token set failed', e);
      Alert.alert('Dev token 저장 실패', String(e));
    }
  };

  const showToken = async () => {
    try {
      const t = await AsyncStorage.getItem('access_token');
      if (t) {
        const masked = `${t.slice(0, 6)}...${t.slice(-6)}`;
        Alert.alert('현재 저장된 토큰', masked);
        console.log('Current token (masked):', masked);
      } else {
        Alert.alert('현재 저장된 토큰', '없음');
        console.log('Current token: null');
      }
    } catch (e) {
      console.warn('showToken failed', e);
      Alert.alert('토큰 읽기 실패', String(e));
    }
  };

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      // eslint-disable-next-line no-undef
      const ToastAndroid = require('react-native').ToastAndroid;
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const submitComment = async () => {
    if (!selectedReport) return;
    const text = (newComment || '').trim();
    if (!text) {
      showToast('댓글 내용을 입력해 주세요.');
      return;
    }
    setPostingComment(true);
    try {
      let tokenToUse: string | null = null;
      try { tokenToUse = await AsyncStorage.getItem('access_token'); } catch (e) { /* ignore */ }
      if (!tokenToUse && __DEV__) tokenToUse = null; // dev token not required for comments by default
      const created = await postReportComment(String(selectedReport.reportId ?? selectedReport.id), text, tokenToUse ?? undefined);
      // append to local comment list
      const next = { ...selectedReport } as any;
      next.comments = Array.isArray(next.comments) ? [...next.comments] : [];
      next.comments.unshift(created);
      setSelectedReport(next);
      setNewComment('');
      showToast('댓글이 추가되었습니다.');
    } catch (e:any) {
      console.warn('댓글 전송 실패', e);
      const serverBody = e?.response?.data;
      if (serverBody) {
        const maybeMsg = typeof serverBody === 'string' ? serverBody : (serverBody.message || serverBody.error || JSON.stringify(serverBody));
        Alert.alert('댓글 추가 실패', String(maybeMsg).slice(0,200));
      } else {
        Alert.alert('댓글 추가 실패', String(e?.message || '서버 오류'));
      }
    } finally {
      setPostingComment(false);
    }
  };

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
        onPress={(e: any) => {
          // e.nativeEvent: { lat, lon }
          const lat = e?.nativeEvent?.lat;
          const lon = e?.nativeEvent?.lon;
          if (typeof lat !== 'number' || typeof lon !== 'number') return;
          // find nearest report within ~50 meters
          if (!reportsData || reportsData.length === 0) return;
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const earthRadius = 6371000; // meters
          let best: any = null;
          let bestDist = Infinity;
          for (const r of reportsData) {
            const rlat = Number(r.locationLat ?? r.location_lat ?? r.__lat ?? 0);
            const rlon = Number(r.locationLng ?? r.location_lng ?? r.__lon ?? 0);
            if (!rlat || !rlon) continue;
            const dLat = toRad(rlat - lat);
            const dLon = toRad(rlon - lon);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat)) * Math.cos(toRad(rlat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = earthRadius * c;
            if (d < bestDist) { bestDist = d; best = r; }
          }
          // threshold 50 meters
          if (best && bestDist <= 50) {
            onMarkerPress(best);
          }
        }}
      />

      {__DEV__ && (
        <View style={{ position: 'absolute', right: 16, top: Platform.select({ android: 60, ios: 80 }), flexDirection: 'column', gap: 8 }}>
          <TouchableOpacity
            style={extraStyles.devBtn}
            onPress={() => setDevToken()}
            accessibilityLabel="set-dev-token"
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>DEV TOKEN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[extraStyles.devBtn, { backgroundColor: '#4C9F70' }]}
            onPress={() => showToken()}
            accessibilityLabel="show-token"
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>SHOW TOKEN</Text>
          </TouchableOpacity>
        </View>
      )}

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
          // open report modal and pass a sensible location (prefer start, fallback to end)
          const loc = start
            ? { location_lat: start.lat, location_lng: start.lon }
            : end
            ? { location_lat: end.lat, location_lng: end.lon }
            : undefined;
          setReportLocation(loc);
          setReportOpen(true);
        }}
      />

      {/* Report modal: 렌더링은 reportOpen으로 제어 */}
      {reportOpen && (
        <ReportModal
          location={reportLocation}
          onClose={() => setReportOpen(false)}
          onSubmitted={(payload) => {
            console.log('제보 완료:', payload);
            setReportOpen(false);
          }}
        />
      )}

      {/* 상세 제보 하단 카드 */}
      <Modal visible={detailOpen} transparent animationType="slide" onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setDetailOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {/* Use a pan responder on the modal container to detect upward drag-to-expand gesture */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }, { height: modalHeight }]}
            >
              {/* '이제 없어요' 버튼: 모달 콘텐츠 내부 오른쪽 상단(카테고리 옆)에 위치하도록 절대 배치) */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  backgroundColor: '#FFD44C',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 18,
                  zIndex: 1000,
                  elevation: 0,
                  shadowColor: 'transparent',
                  shadowOpacity: 0,
                }}
                onPress={() => { setDetailOpen(false); }}
              >
                <Text style={{ fontWeight: '700', color: '#000' }}>이제 없어요</Text>
              </TouchableOpacity>

              {loadingDetail ? (
                <Text style={{ color: '#000' }}>불러오는 중...</Text>
              ) : selectedReport ? (
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#000' }}>{selectedReport.category ?? selectedReport.description ?? '제보'}</Text>
                  <Text style={{ color: '#000', marginBottom: 12 }}>{selectedReport.description ?? selectedReport.content ?? ''}</Text>
                  {selectedReport.imageUrl ? (
                    <Image source={{ uri: selectedReport.imageUrl }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 12 }} resizeMode="cover" />
                  ) : null}

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', marginBottom: 8, color: '#000' }}>댓글</Text>
                      {/* Render actual comment(s). Backend may return a single string field or an array of comments
                          with different property names; handle common shapes defensively. */}
                      {(() => {
                        const sr: any = selectedReport as any;
                        // normalize array-of-comments shapes
                        let list: string[] = [];
                        if (Array.isArray(sr.comments) && sr.comments.length > 0) {
                          // comments items usually have a `content` field that holds the comment text
                          list = sr.comments.map((c: any) => (typeof c === 'string' ? c : c.content ?? c.text ?? c.comment ?? c.body ?? c.message ?? JSON.stringify(c)));
                        } else if (Array.isArray(sr.replies) && sr.replies.length > 0) {
                          list = sr.replies.map((c: any) => (typeof c === 'string' ? c : c.content ?? c.text ?? c.comment ?? c.body ?? c.message ?? JSON.stringify(c)));
                        } else {
                          const single = sr.userComment ?? sr.comment ?? sr.description ?? sr.content ?? sr.note ?? sr.message ?? null;
                          if (single) list = [String(single)];
                        }

                        if (list.length === 0) {
                          return <Text style={{ color: '#666', marginBottom: 12 }}>아직 댓글이 없습니다.</Text>;
                        }

                        // Show up to 4 comments only
                        const toShow = list.slice(0, 3);
                        return (
                          <View style={{ marginBottom: 8 }}>
                            {toShow.map((txt: string, idx: number) => (
                              <Text key={idx} style={{ color: '#000', marginBottom: 8 }}>{txt}</Text>
                            ))}
                            {list.length > 4 ? (
                              <Text style={{ color: '#666', fontSize: 12 }}>외 {list.length - 4}개의 댓글</Text>
                            ) : null}
                          </View>
                        );
                      })()}
                    
                      {/* 댓글 입력 UI는 하단 좌측 고정으로 이동함 */}
                    </View>

                          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                            {/* 위로 끌어올리면 전체보기(풀스크린)로 전환됩니다. */}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <View style={{ alignItems: 'center', marginLeft: 6 }}>
                          <TouchableOpacity style={{ padding: 6 }} onPress={() => { /* 좋아요 처리 예: send feedback */ }}>
                            <Text style={{ fontSize: 28 }}>😊</Text>
                          </TouchableOpacity>
                          <Text style={{ color: '#000', marginTop: 4 }}>좋음</Text>
                        </View>
                        <View style={{ alignItems: 'center', marginLeft: 6 }}>
                          <TouchableOpacity style={{ padding: 6 }} onPress={() => { }}>
                            <Text style={{ fontSize: 28 }}>😐</Text>
                          </TouchableOpacity>
                          <Text style={{ color: '#000', marginTop: 4 }}>보통</Text>
                        </View>
                        <View style={{ alignItems: 'center', marginLeft: 6 }}>
                          <TouchableOpacity style={{ padding: 6 }} onPress={() => { }}>
                            <Text style={{ fontSize: 28 }}>☹️</Text>
                          </TouchableOpacity>
                          <Text style={{ color: '#000', marginTop: 4 }}>아쉬움</Text>
                        </View>
                      </View>

                    </View>
                  </View>

                  {/* 버튼은 모달 콘텐츠 내부에서 제거하고, 아래에 절대 위치로 배치됩니다 */}
                </View>
              ) : (
                <Text style={{ color: '#000' }}>선택된 제보가 없습니다.</Text>
              )}
            </Animated.View>
          </View>
        </Pressable>
        {/* 상세 모달이 열려있을 때 화면 오른쪽 아래에 고정된 '이제 없어요' 버튼 */}
        {/* moved '이제 없어요' button inside modal content */}
        {/* 댓글 입력창: 모달 하단 왼쪽에 고정 */}
        {detailOpen && selectedReport ? (
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: Platform.select({ android: 24, ios: 34 }),
              zIndex: 999,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 6, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }}>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor="#999"
                style={{ flex: 1, paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 10 : 6, maxHeight: 90 }}
                editable={!postingComment}
                returnKeyType="send"
                onSubmitEditing={() => { submitComment(); }}
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={postingComment}
                style={{ marginLeft: 8, backgroundColor: '#FFD44C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
              >
                {postingComment ? <ActivityIndicator /> : <Text style={{ fontWeight: '700' }}>전송</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* 클러스터 전체 리스트 풀스크린 보기 */}
      {clusterListOpen && (
        <Modal visible={clusterListOpen} animationType="slide" onRequestClose={() => setClusterListOpen(false)}>
          <ClusterReportsScreen clusterId={clusterIdForList ?? ''} nearbyReports={clusterNearbyReports ?? undefined} onClose={() => { setClusterListOpen(false); setClusterNearbyReports(null); }} />
        </Modal>
      )}

      {/* 제보 카드 리스트(디버그용) 제거됨 */}

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
  devBtn: {
    position: 'absolute',
    right: 16,
    top: Platform.select({ android: 60, ios: 80 }),
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
});

// Merge extraStyles into styles object by spreading when used
