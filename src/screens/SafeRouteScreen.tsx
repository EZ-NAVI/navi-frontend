// SafeRouteScreen.tsx
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
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import TMapView from "../components/TMapView";
import { useTMapCommands } from "../components/useTMapCommands";
import { useRouteData } from "../context/RouteContext";
import { fetchPreviewRoute, saveRoute } from "../api/routes";
import SafetyNoticeModal from "../components/SafetyNoticeModal";
import ReportModal from "../components/ReportModal";
import { fetchReports, fetchReportById, fetchReportComments, postReportComment, postReportEvaluation, postReportNotThere } from "../api/reports";
import ClusterReportsScreen from "./ClusterReportsScreen";
import { Modal, PanResponder, Animated, Dimensions } from 'react-native';
import { useReportStore } from "../stores/reportStore";
import { DEV_TOKEN } from "../config/dev";

// 🔥 승아 안전 경로 기능 관련 추가 import
import { evaluateRoute } from "../api/evaluateRoute";
import { startTracking, stopTracking } from "../utils/locationTracker";
import { haversine } from "../utils/haversine";
import RouteRatingModal from "../components/RouteRatingModal";

export default function SafeRouteScreen() {
  const navigation = useNavigation<any>();
  const { start, end } = useRouteData();
  const map = useTMapCommands();
  const [isReady, setIsReady] = useState(false);
  // Persisted toggle to hide/show development-only UI (default: hidden)
  const [showDevUI, setShowDevUI] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem('show_dev_ui');
        if (!mounted) return;
        // only show when explicitly set to 'true'
        setShowDevUI(v === 'true');
        console.log('[SafeRoute] show_dev_ui loaded:', v);
      } catch (e) {
        console.warn('show_dev_ui read failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // reportStore에서 제보 리스트 가져오기 (WebSocket 실시간 갱신 반영)
  const reportsFromStore = useReportStore((state) => state.reports);
  const setReportsInStore = useReportStore((state) => state.setReports);

  // 로컬 상태는 초기 로드 및 마커 표시용으로 유지
  const [reportsData, setReportsData] = useState<any[]>([]);

  // 제보하기 버튼 상태
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLocation, setReportLocation] = useState<any | undefined>(undefined);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Track accessibility status of the selected report's image so we can show
  // a friendly fallback when the URL is missing or returns 403/404.
  const [selectedImageStatus, setSelectedImageStatus] = useState<'unknown' | 'ok' | 'error' | 'no-url'>('unknown');

  // 🔥 승아 기능용 상태 추가
  const [routeId, setRouteId] = useState<string | null>(null);
  const [userPositions, setUserPositions] = useState<any[]>([]);
  const reachedRef = useRef(false);
  const [showRating, setShowRating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lon: number } | null>(null);
  const routePathRef = useRef<any[]>([]);

  // 컴포넌트 언마운트 시 GPS 추적 종료
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  // Helper to check remote image availability using a HEAD request where possible.
  const checkSelectedImage = async (url?: string | null) => {
    if (!url) {
      setSelectedImageStatus('no-url');
      return;
    }
    try {
      // Use HEAD to avoid downloading the full image. Some servers may not
      // support HEAD; in that case a GET may still succeed but be heavier.
      const res = await fetch(url, { method: 'HEAD' });
      if (res && res.ok) setSelectedImageStatus('ok');
      else setSelectedImageStatus('error');
    } catch (e) {
      // network error or CORS-like issue
      setSelectedImageStatus('error');
    }
  };
  const [newComment, setNewComment] = useState<string>('');
  const [postingComment, setPostingComment] = useState(false);
  const [clusterListOpen, setClusterListOpen] = useState(false);
  const [clusterIdForList, setClusterIdForList] = useState<string | number | null>(null);
  const [clusterNearbyReports, setClusterNearbyReports] = useState<any[] | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const applyOptimisticEvaluation = (evalKey: 'good' | 'normal' | 'bad') => {
    setSelectedReport((prev: any) => {
      if (!prev) return prev;
      const current = prev.userEvaluation ?? null;
      if (current === evalKey) return prev; // no change
      let bad = prev.badCount ?? 0;
      let normal = prev.normalCount ?? 0;
      let good = prev.goodCount ?? 0;
      let total = prev.totalFeedbacks ?? 0;
      if (current === 'bad') bad = Math.max(0, bad - 1);
      if (current === 'normal') normal = Math.max(0, normal - 1);
      if (current === 'good') good = Math.max(0, good - 1);
      if (evalKey === 'bad') bad += 1;
      if (evalKey === 'normal') normal += 1;
      if (evalKey === 'good') good += 1;
      const newTotal = current ? total : (total + 1);
      return { ...prev, userEvaluation: evalKey, badCount: bad, normalCount: normal, goodCount: good, totalFeedbacks: newTotal };
    });
  };

  // Log when cluster list modal opens and what clusterId is requested
  useEffect(() => {
    if (clusterListOpen) {
      try { console.log('Opening ClusterReportsScreen: clusterIdForList=', clusterIdForList, 'clusterNearbyReportsCount=', clusterNearbyReports?.length ?? 0); } catch (e) {}
    }
  }, [clusterListOpen, clusterIdForList, clusterNearbyReports]);

  // If this screen receives navigation params asking to open the cluster modal,
  // open it on focus and then clear the param so it doesn't repeatedly open.
  useEffect(() => {
    const onFocus = () => {
      try {
        const p = (navigation as any).dangerouslyGetState?.() ? (navigation as any).dangerouslyGetState().routes.find((r:any) => r.name === 'SafeRoute')?.params : undefined;
        // Prefer reading from route params when available (safe fallback)
        let open = undefined;
        try { const rparams = (navigation as any).getState && (navigation as any).getState().routes.find((r:any) => r.name === 'SafeRoute')?.params; if (rparams) open = rparams; } catch (e) {}
        // fallback to route param reading via navigation if available
        const params = open || (navigation as any).route?.params || {};
        if (params && params.openClusterModal && (params.openClusterId || params.openClusterId === 0)) {
          setClusterIdForList(params.openClusterId ?? null);
          setClusterNearbyReports(null);
          setClusterListOpen(true);
          try { navigation.setParams && navigation.setParams({ openClusterModal: false, openClusterId: undefined }); } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    };
    const unsub = navigation.addListener('focus', onFocus);
    // run once
    onFocus();
    return unsub;
  }, [navigation]);

  // Use a ref to expose the latest detailOpen value inside PanResponder callbacks
  // because the PanResponder is created once and its closures would otherwise
  // capture a stale value of detailOpen.
  const detailOpenRef = useRef<boolean>(detailOpen);
  useEffect(() => { detailOpenRef.current = detailOpen; }, [detailOpen]);
  // Also keep a ref for selectedReport so pan callbacks can read the
  // current selection even if the closure captured an older value.
  const selectedReportRef = useRef<any | null>(selectedReport);
  useEffect(() => { selectedReportRef.current = selectedReport; }, [selectedReport]);

  // Try to derive cluster id from a report object or by matching coordinates against loaded reportsData
  const resolveClusterId = (report: any): string | null => {
    try {
      console.log('resolveClusterId called for report:', report && typeof report === 'object' ? (report.reportId ?? report.id ?? '(no id)') : report);
    } catch (e) {}
    if (!report) return null;
    const possible = report.clusterId ?? report.cluster_id ?? report.cluster?.id ?? report.cluster?.cluster_id ?? report.cluster_id;
    if (possible) {
      try { console.log('resolveClusterId: found direct cluster id:', possible); } catch (e) {}
      return String(possible);
    }

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
      try { console.log('resolveClusterId: nearest report match', { id: best.reportId ?? best.id, dist: bestDist, candidateCluster: pc }); } catch (e) {}
      if (pc) return String(pc);
    }

    return null;
  };

  // animated pan for bottom detail modal drag-to-expand
  const screenHeight = Dimensions.get('window').height;
  // collapsed height for the bottom modal (px) — adjust for desired initial size
  // make the initial collapsed modal occupy slightly more than half the screen
  // so the modal appears a bit higher on pin tap
  const COLLAPSED_HEIGHT = Math.round(screenHeight * 0.55);
  const MAX_HEIGHT = Math.round(screenHeight * 0.9);
  const modalHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  const panResponder = useRef(
    PanResponder.create({
      // Only enable pan responder when the detail modal is actually open. We
      // read the value from detailOpenRef.current to avoid stale closure values.
      onStartShouldSetPanResponder: () => {
        return Boolean(detailOpenRef.current);
      },
      onMoveShouldSetPanResponder: (_evt, gs) => {
        return Boolean(detailOpenRef.current) && Math.abs(gs.dy) > 5;
      },
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
        // Use refs to read the latest state values (avoid stale closure capture)
        const currentDetailOpen = detailOpenRef.current;
        const currentSelected = selectedReportRef.current;
        try { console.log('panRelease: modalHeight value check, vy:', gs.vy, 'detailOpen:', currentDetailOpen, 'selectedReport:', currentSelected ? (currentSelected.reportId ?? currentSelected.id ?? '(has id)') : null); } catch (e) {}

        modalHeight.stopAnimation((value: number) => {
          const shouldOpen = value > screenHeight * 0.5 || gs.vy < -0.8;
          if (shouldOpen) {
            // If selectedReport is missing at this timing, abort opening the cluster list and
            // snap back; this prevents the '클러스터 정보 없음' alert caused by timing issues.
            if (!currentSelected) {
              try { console.warn('panRelease aborted: selectedReport is null'); } catch (e) {}
              Animated.timing(modalHeight, { toValue: COLLAPSED_HEIGHT, duration: 200, useNativeDriver: false }).start();
              return;
            }
            // animate to full height then open cluster list
              Animated.timing(modalHeight, { toValue: MAX_HEIGHT, duration: 220, useNativeDriver: false }).start(() => {
              const cid = resolveClusterId(currentSelected);
              if (cid) {
                setClusterIdForList(String(cid));
                setClusterNearbyReports(null);
                // keep ref in sync for immediate reads by pan handlers
                detailOpenRef.current = false;
                setDetailOpen(false);
                setClusterListOpen(true);
                // reset height for next open
                modalHeight.setValue(COLLAPSED_HEIGHT);
                return;
              }

              // Fallback: try to find nearby reports within 100m and show them
              try {
                const sr = currentSelected as any;
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
                    // keep ref in sync for immediate reads by pan handlers
                    detailOpenRef.current = false;
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

  // ✅ 출발/도착 + preview 경로 + GPS 추적 (승아 기능 merge)
  useEffect(() => {
    if (!isReady || !map.ref.current) return;

    // 출발지 & 도착지 마커 표시
    if (start) {
      map.addMarker(start.lat, start.lon, "출발지");
      map.animateTo(start.lat, start.lon, 16);
    }
    if (end) {
      map.addMarker(end.lat, end.lon, "도착지");
    }

    const fetchRoute = async () => {
      if (!start || !end) return;

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

          // 경로 좌표 저장 (나중에 필요하면 사용)
          routePathRef.current = pathCoords;

          // 이전 경로 평가 정보 초기화
          setRouteId(null);
          reachedRef.current = false;
          setUserPositions([]);

          // 지도에 경로 그리기
          map.addPolyline(pathCoords);

          const middle = pathCoords[Math.floor(pathCoords.length / 2)];
          map.animateTo(middle.lat, middle.lon, 15);

          // ⭐ GPS 추적 시작
          startTracking(setUserPositions);
        } else {
          Alert.alert("경로를 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error("❌ 경로 요청 실패:", err);
        Alert.alert("서버 연결 실패", "잠시 후 다시 시도해주세요.");
      }
    };

    fetchRoute();
  }, [start, end, isReady]);

  // 🔍 GPS 위치 변화 + 목적지 도착(30m) 감지
  useEffect(() => {
    if (userPositions.length === 0) return;
    const latest = userPositions[userPositions.length - 1];
    setCurrentPosition({ lat: latest.lat, lon: latest.lon });

    if (!end) return;

    const distToDest = haversine(latest.lat, latest.lon, end.lat, end.lon);
    console.log(`🧭 목적지까지 거리: ${distToDest.toFixed(1)}m`);

    if (reachedRef.current) return;

    // ✅ 30m 이내 도착으로 판단
    if (distToDest <= 30) {
      console.log("🎉 목적지 도착!(<=30m)");
      reachedRef.current = true;
      stopTracking();
      saveRouteToServer();
    }
  }, [userPositions, end]);

  // 지도가 준비되면 전체 제보를 불러와서 마커로 표시합니다.
  // 롱 폴링: 30초마다 제보 목록을 갱신합니다.
  useEffect(() => {
    if (!isReady || !map.ref.current) return;

    const loadReports = async () => {
      try {
        // 우선 AsyncStorage에 토큰이 있는지 확인하고, 없으면 개발용 토큰을 사용합니다.
        let tokenToUse: string | null = null;
        try {
          tokenToUse = await AsyncStorage.getItem('access_token');
        } catch (e) {
          console.warn('AsyncStorage read failed', e);
        }
        if (!tokenToUse) tokenToUse = DEV_TOKEN;

        const reports = await fetchReports(tokenToUse ?? undefined);
        console.log("📍 전체 제보 불러옴:", reports);

        if (Array.isArray(reports)) {
          setReportsData(reports);
          // reportStore에도 저장 (WebSocket 실시간 갱신 반영용)
          setReportsInStore(reports);

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

          // 첫 번째 유효 제보 위치로 카메라 이동(개발 편의) - 최초 로딩 시에만
          if (validReports.length > 0 && !reportsData.length) {
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

    // 최초 로딩
    loadReports();

    // 롱 폴링: 30초마다 제보 목록 갱신
    const pollingInterval = setInterval(() => {
      console.log('🔄 [Long Polling] 제보 목록 갱신 중...');
      loadReports();
    }, 30000); // 30초

    // 클린업: 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      clearInterval(pollingInterval);
      console.log('🛑 [Long Polling] 종료');
    };
  }, [isReady]);

  // reportStore의 제보 리스트가 변경되면 로컬 상태도 업데이트 (WebSocket 실시간 반영)
  useEffect(() => {
    if (reportsFromStore.length > 0) {
      setReportsData(reportsFromStore);
      console.log('📡 [SafeRouteScreen] reportStore 업데이트 감지, 제보 수:', reportsFromStore.length);
    }
  }, [reportsFromStore]);

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
      // Debug: show full detail returned by backend so we can inspect image fields
      try {
        console.log('DEBUG /reports/{id} detail:', JSON.stringify(detail));
      } catch (e) {
        console.log('DEBUG /reports/{id} detail (non-serializable):', detail);
      }
      // Try to fetch comments for this report; non-fatal if it fails.
      try {
        const comments = await fetchReportComments(String(reportId), tokenToUse ?? undefined);
        // attach comments in normalized shape
        detail.comments = Array.isArray(comments) ? comments : (comments ? [comments] : []);
      } catch (e) {
        console.warn('댓글 불러오기 실패', e);
        detail.comments = detail.comments ?? [];
      }
      // synchronize refs immediately to avoid pan gesture races
      selectedReportRef.current = detail;
      setSelectedReport(detail);
      detailOpenRef.current = true;
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
    try {
      if (!DEV_TOKEN) {
        console.warn('DEV_TOKEN이 설정되지 않았습니다.');
        return;
      }
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

  // 🔥 경로 저장 → 평가 모달 열기
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

  // ⭐ 평가 제출
  const handleSubmitRating = (rating: number) => {
    if (!routeId) {
      console.log("❌ routeId 없음 → 평가 불가");
      return;
    }

    evaluateRoute(routeId, Number(rating))
      .then(() => console.log("⭐ 평가 저장 성공"))
      .catch(() => console.log("❌ 평가 저장 실패"));
  };

  // (더이상 애니메이션 토글 필요 없음)

  return (
    <View style={styles.container}>
      {/* ⭐ 승아 별점 모달 */}
      <RouteRatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleSubmitRating}
      />

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

      {__DEV__ && showDevUI && (
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
        {/* 개발 디버그: DevSettings 이동 원형 버튼 (임시) */}
        {__DEV__ && showDevUI && (
          <TouchableOpacity
            style={extraStyles.debugCircle}
            onPress={() => navigation.navigate('DevSettings')}
            accessibilityLabel="dev-settings-test"
          >
            <Text style={extraStyles.debugCircleText}>test</Text>
          </TouchableOpacity>
        )}
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
      <Modal visible={detailOpen} transparent animationType="slide" onRequestClose={() => { detailOpenRef.current = false; setDetailOpen(false); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => { detailOpenRef.current = false; setDetailOpen(false); }}>
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
                onPress={() => {
                  const rid = String(selectedReport?.reportId ?? selectedReport?.id ?? '');
                  if (!rid) { detailOpenRef.current = false; setDetailOpen(false); return; }
                  Alert.alert('이제 없어요', '정말 더 이상 존재하지 않나요?', [
                    { text: '취소', style: 'cancel' },
                    { text: '확인', onPress: async () => {
                        try {
                          try {
                            console.log('[NotThere] map modal send for reportId=', rid, 'category=', selectedReport?.category ?? selectedReport?.title ?? '제보');
                          } catch (logErr) {}
                          let token: string | null = null;
                          try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                          await postReportNotThere(rid, token ?? undefined);
                        } catch (e: any) {
                          console.warn('not-there failed', e);
                          const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || '상태 전송에 실패했습니다.';
                          if (errorMsg.includes('이미') && errorMsg.includes('이제 없어요')) {
                            Alert.alert('알림', '이미 누른 제보입니다.');
                          } else {
                            Alert.alert('처리 실패', errorMsg);
                          }
                        }
                        // 닫기
                        detailOpenRef.current = false; setDetailOpen(false);
                      } }
                  ]);
                }}
              >
                <Text style={{ fontWeight: '700', color: '#000' }}>이제 없어요</Text>
              </TouchableOpacity>

              {loadingDetail ? (
                <Text style={{ color: '#000' }}>불러오는 중...</Text>
              ) : selectedReport ? (
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#000' }}>{selectedReport.category ?? selectedReport.description ?? '제보'}</Text>
                  <Text style={{ color: '#000', marginBottom: 12 }}>{selectedReport.description ?? selectedReport.content ?? ''}</Text>
                  {(() => {
                    // Normalize common image fields from backend: support camelCase and snake_case
                    const sr: any = selectedReport as any;
                    const imageUrl = sr.imageUrl ?? sr.image_url ?? sr.photoUrl ?? sr.photo_url ?? sr.file_url ?? sr.object_url ?? null;
                    if (!imageUrl) return null;

                    if (selectedImageStatus === 'unknown') {
                      // check in background if not checked yet
                      checkSelectedImage(imageUrl);
                      return <ActivityIndicator style={{ width: '100%', height: 180, marginBottom: 12 }} />;
                    }

                    if (selectedImageStatus === 'ok') {
                      return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 12 }} resizeMode="cover" />;
                    }

                    // error state: show placeholder and allow retry
                    return (
                      <View style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 12, backgroundColor: '#F2F3F5', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#666', marginBottom: 8 }}>이미지를 불러올 수 없습니다.</Text>
                        <TouchableOpacity onPress={() => checkSelectedImage(imageUrl)} style={{ backgroundColor: '#FFD44C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                          <Text style={{ fontWeight: '700' }}>재시도</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', marginBottom: 8, color: '#000' }}>댓글</Text>
                      {/* Render actual comment(s). Backend may return a single string field or an array of comments
                          with different property names; handle common shapes defensively. */}
                      {(() => {
                        const sr: any = selectedReport as any;
                        // Only show comments returned from the comments endpoint.
                        // Do NOT fall back to report content — that caused report text
                        // to appear where comment list is expected.
                        const list: string[] = Array.isArray(sr.comments) && sr.comments.length > 0
                          ? sr.comments.map((c: any) => (typeof c === 'string' ? c : c.content ?? c.text ?? c.comment ?? c.body ?? c.message ?? JSON.stringify(c)))
                          : [];

                        if (list.length === 0) {
                          return <Text style={{ color: '#666', marginBottom: 12 }}>아직 댓글이 없습니다.</Text>;
                        }

                        // Show up to 4 comments only
                        const toShow = list.slice(0, 3);
                        return (
                          <View style={{ marginBottom: 8 }}>
                            {toShow.map((txt: string, idx: number) => (
                              <Text key={idx} style={{ color: '#000', marginBottom: 8, fontSize: 14 }}>{txt}</Text>
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
                        {/* 좋음(라벨) → bad 평가 키 */}
                        <View style={{ alignItems: 'center', marginLeft: 6 }}>
                          <TouchableOpacity
                            style={{ padding: 6 }}
                            disabled={evaluating}
                            onPress={async () => {
                              if (!selectedReport || evaluating) return;
                              try {
                                setEvaluating(true);
                                let token: string | null = null;
                                try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                                await postReportEvaluation(String(selectedReport.reportId ?? selectedReport.id), 'bad', token ?? undefined);
                                applyOptimisticEvaluation('bad');
                              } catch (e) {
                                console.warn('evaluation failed (좋음->bad)', e);
                                Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
                              } finally { setEvaluating(false); }
                            }}
                          >
                            <Text style={{ fontSize: 28 }}>😊</Text>
                          </TouchableOpacity>
                          <Text style={{ marginTop: 4, fontWeight: selectedReport?.userEvaluation === 'bad' ? '700' : '400', color: selectedReport?.userEvaluation === 'bad' ? '#000' : '#666' }}>
                            좋음 {Number(selectedReport?.badCount ?? 0)}
                          </Text>
                        </View>
                        {/* 보통 → normal */}
                        <View style={{ alignItems: 'center', marginLeft: 6 }}>
                          <TouchableOpacity
                            style={{ padding: 6 }}
                            disabled={evaluating}
                            onPress={async () => {
                              if (!selectedReport || evaluating) return;
                              try {
                                setEvaluating(true);
                                let token: string | null = null;
                                try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                                await postReportEvaluation(String(selectedReport.reportId ?? selectedReport.id), 'normal', token ?? undefined);
                                applyOptimisticEvaluation('normal');
                              } catch (e) {
                                console.warn('evaluation failed (보통->normal)', e);
                                Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
                              } finally { setEvaluating(false); }
                            }}
                          >
                            <Text style={{ fontSize: 28 }}>😐</Text>
                          </TouchableOpacity>
                          <Text style={{ marginTop: 4, fontWeight: selectedReport?.userEvaluation === 'normal' ? '700' : '400', color: selectedReport?.userEvaluation === 'normal' ? '#000' : '#666' }}>
                            보통 {Number(selectedReport?.normalCount ?? 0)}
                          </Text>
                        </View>
                        {/* 아쉬움 → good */}
                        <View style={{ alignItems: 'center', marginLeft: 6 }}>
                          <TouchableOpacity
                            style={{ padding: 6 }}
                            disabled={evaluating}
                            onPress={async () => {
                              if (!selectedReport || evaluating) return;
                              try {
                                setEvaluating(true);
                                let token: string | null = null;
                                try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                                await postReportEvaluation(String(selectedReport.reportId ?? selectedReport.id), 'good', token ?? undefined);
                                applyOptimisticEvaluation('good');
                              } catch (e) {
                                console.warn('evaluation failed (아쉬움->good)', e);
                                Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
                              } finally { setEvaluating(false); }
                            }}
                          >
                            <Text style={{ fontSize: 28 }}>☹️</Text>
                          </TouchableOpacity>
                          <Text style={{ marginTop: 4, fontWeight: selectedReport?.userEvaluation === 'good' ? '700' : '400', color: selectedReport?.userEvaluation === 'good' ? '#000' : '#666' }}>
                            아쉬움 {Number(selectedReport?.goodCount ?? 0)}
                          </Text>
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
        {/* 댓글 입력창은 ReportDetail 화면(전체 페이지)로 이동했습니다. 핀을 눌렀을 때 뜨는 하단 모달에서는 댓글 입력을 표시하지 않습니다. */}
      </Modal>

      {/* 클러스터 전체 리스트 풀스크린 보기 */}
      {clusterListOpen && (
        <Modal visible={clusterListOpen} animationType="slide" onRequestClose={() => setClusterListOpen(false)}>
          <ClusterReportsScreen
            clusterId={clusterIdForList ?? ''}
            nearbyReports={clusterNearbyReports ?? undefined}
            onClose={() => { setClusterListOpen(false); setClusterNearbyReports(null); }}
            onSelect={(r) => {
              // close the cluster list and show the selected report on the map
              try { setClusterListOpen(false); setClusterNearbyReports(null); } catch (e) {}
              try {
                // reuse existing handler which fetches detail and opens the bottom modal
                onMarkerPress(r);
              } catch (e) {
                console.warn('Cluster select -> onMarkerPress failed', e);
              }
            }}
          />
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
  debugCircle: {
    position: 'absolute',
    right: 24,
    // place above the long report button
    bottom: Platform.select({ android: 110, ios: 120 }),
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  debugCircleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
