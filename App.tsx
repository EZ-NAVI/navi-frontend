/*
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

*/

import * as React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'react-native';
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator, StackNavigationProp } from "@react-navigation/stack";
import SafeRouteScreen from "./src/screens/SafeRouteScreen";
import LocationSearchScreen from "./src/screens/LocationSearchScreen";
import ReportDetailScreen from "./src/screens/ReportDetailScreen";
import ReportEditScreen from "./src/screens/ReportEditScreen";
import DevSettingsScreen from "./src/screens/DevSettingsScreen";
import DebugNotificationScreen from "./src/screens/DebugNotificationScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignupTypeScreen from "./src/screens/SignupTypeScreen";
import SignupConsentScreen from "./src/screens/SignupConsentScreen";
import SignupFormScreen from "./src/screens/SignupFormScreen";
import { RouteProvider } from "./src/context/RouteContext";
import { WebSocketProvider, WebSocketContext } from "./src/context/WebSocketContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { on as onEvent } from './src/lib/emitter';
import { DEV_USER_ID } from "./src/config/dev";
import ReportApprovalModal from "./src/components/ReportApprovalModal";
import ReportEditModal from "./src/components/ReportEditModal";
import { useReportApprovalModal } from "./src/stores/reportApprovalModalStore";
import { useReportEditModal } from "./src/stores/reportEditModalStore";
import { postReportReview, fetchReportById } from "./src/api/reports";
import { getMe } from './src/api/auth';
import { Alert, Platform, LogBox } from "react-native";
import AppAlertModal from './src/components/AppAlertModal';
import { useAppAlertStore } from './src/stores/appAlertStore';
import messaging from '@react-native-firebase/messaging';
import navigationRef from './src/navigationRef';
import { getCurrentUserRole } from './src/lib/authState';

const Stack = createStackNavigator();

// 승인 모달을 포함한 래퍼 컴포넌트
function AppWithModal({ children }: { children: React.ReactNode }) {
  const { isVisible, reportData, hideModal } = useReportApprovalModal();

  const handleApprove = async () => {
    console.log('[Modal] 승인 버튼 클릭:', reportData);
    
    if (!reportData) return;
    
    const reportId = reportData.id || reportData.reportId || reportData.report_id;
    if (!reportId) {
      Alert.alert('오류', '제보 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      // ✅ [②단계] POST /reports/{report_id}/review (API만 호출)
      const token = await AsyncStorage.getItem('access_token');
      await postReportReview(reportId, '승인', token || undefined);
      
      console.log('✅ [API] 승인 완료 - 서버가 report.reviewed 이벤트 전송함');
      try {
        useAppAlertStore.getState().show({ title: '✅ 승인 완료', body: '제보가 승인되었습니다.', ctaText: '확인' });
      } catch (e) {
        Alert.alert('✅ 승인 완료', '제보가 승인되었습니다.');
      }
      hideModal();
    } catch (error: any) {
      console.error('❌ [API] 승인 실패:', error);
      Alert.alert('오류', '승인 처리 중 문제가 발생했습니다.');
    }
  };

  const handleReject = async () => {
    console.log('[Modal] 반려 버튼 클릭:', reportData);
    
    if (!reportData) return;
    
    const reportId = reportData.id || reportData.reportId || reportData.report_id;
    if (!reportId) {
      Alert.alert('오류', '제보 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      // ❌ [②단계] POST /reports/{report_id}/review (API만 호출)
      // 서버가 자동으로 report.reviewed (REJECTED) 이벤트를 자녀에게 전송
      const token = await AsyncStorage.getItem('access_token');
      await postReportReview(reportId, '반려', token || undefined);
      
      console.log('❌ [API] 반려 완료 - 서버가 report.reviewed 이벤트 전송함 (자녀에게 수정 모달 표시)');
      try {
        useAppAlertStore.getState().show({ title: '❌ 반려 완료', body: '제보가 반려되었습니다.\n자녀가 수정할 수 있습니다.', ctaText: '확인' });
      } catch (e) {
        Alert.alert('❌ 반려 완료', '제보가 반려되었습니다.\n자녀가 수정할 수 있습니다.');
      }
      hideModal();
    } catch (error: any) {
      console.error('❌ [API] 반려 실패:', error);
      Alert.alert('오류', '반려 처리 중 문제가 발생했습니다.');
    }
  };

  return (
    <>
      {children}
      <ReportApprovalModal
        visible={isVisible}
        reportData={reportData}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={hideModal}
      />
    </>
  );
}

// 네비게이션 내부 컴포넌트 (Stack.Screen들과 EditModalHandler 포함)
function NavigationContent() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isVisible, reportData, hideModal } = useReportEditModal();

  const handleEdit = () => {
    console.log('[EditModal] 수정하기 버튼 클릭:', reportData);
    
    if (!reportData) {
      Alert.alert('오류', '제보 데이터를 찾을 수 없습니다.');
      return;
    }
    
    const reportId = reportData.reportId || reportData.report_id || reportData.id;
    if (!reportId) {
      Alert.alert('오류', '제보 ID를 찾을 수 없습니다.');
      return;
    }

    hideModal();
    
    navigation.navigate('ReportEdit', {
      reportId,
      category: reportData.category,
      description: reportData.description,
      image_url: reportData.image_url || reportData.imageUrl,
      location_lat: reportData.location_lat || reportData.locationLat,
      location_lng: reportData.location_lng || reportData.locationLng,
    });
  };

  return (
    <ReportEditModal
      visible={isVisible}
      reportData={reportData}
      onEdit={handleEdit}
      onClose={hideModal}
    />
  );
}

export default function App() {
  // Suppress noisy react-native-firebase namespaced-deprecation warnings during development.
  // These warnings are emitted by the RNFirebase migration shim; they are harmless
  // but noisy. Prefer migrating to the modular API per https://rnfirebase.io/migrating-to-v22
  // for a permanent fix. For now, ignore that specific warning pattern.
  try {
    LogBox.ignoreLogs([
      'This method is deprecated (as well as all React Native Firebase namespaced API)'
    ]);
  } catch (e) {
    // ignore
  }
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // 앱 시작 시 로그인된 유저 ID 가져오기
  React.useEffect(() => {
    const loadUserId = async () => {
      try {
        // TODO: 실제 authStore나 useAuthUser 훅으로 대체 필요
        // const user = authStore.getState().user;
        // setUserId(user?.id || null);
        
        // 앱 시작 시에는 단순히 저장된 user_id가 있어도 즉시 WebSocket을 연결하지 않도록
        // access_token(로그인 여부)을 함께 확인합니다.
        const storedUserId = await AsyncStorage.getItem('user_id');
        const accessToken = await AsyncStorage.getItem('access_token');
        if (accessToken) {
          // access_token이 존재하면 서버에 검증 요청을 보내 실제 로그인 상태인지 확인합니다.
          try {
            const me = await getMe();
            const resolvedId = me?.userId ?? me?.id ?? storedUserId ?? null;
            console.log('[App] GET /users/me 확인됨. userId:', resolvedId);
            if (resolvedId) {
              setUserId(String(resolvedId));
            } else {
              console.log('[App] GET /users/me 응답에 userId가 없음 — 로그인 상태로 간주하지 않습니다.');
              await AsyncStorage.multiRemove(['access_token', 'token_type', 'user_id']);
              setUserId(null);
            }
          } catch (e) {
            console.warn('[App] GET /users/me 실패 — 저장된 토큰이 유효하지 않거나 네트워크 문제입니다.', e);
            // 토큰이 유효하지 않다면 정리하고 WebSocket 연결을 방지
            try { await AsyncStorage.multiRemove(['access_token', 'token_type', 'user_id']); } catch (er) {}
            setUserId(null);
          }
        } else {
          console.log('[App] access_token 없음 — WebSocket 연결을 지연합니다. storedUserId=', storedUserId);
          setUserId(null);
        }
      } catch (error) {
        console.error('[App] userId 로드 실패:', error);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserId();

    // Subscribe to runtime userId changes (e.g., immediately after login)
    const unsubscribe = onEvent('user:changed', (newId: any) => {
      try {
        const id = newId ? String(newId) : null;
        console.log('[App] user:changed event received, newId=', id);
        setUserId(id);
      } catch (e) {
        console.warn('[App] user:changed handler error', e);
      }
    });

    return () => {
      try { unsubscribe(); } catch (e) {}
    };
  }, []);

  // FCM 푸시 알림: 백그라운드/종료 상태에서 알림 클릭 처리만 담당
  React.useEffect(() => {
    // 앱이 백그라운드에 있다가 알림을 클릭해 열린 경우
    const unsubscribeOnOpened = messaging().onNotificationOpenedApp(async (remoteMessage) => {
      console.log('FCM notification opened app:', remoteMessage);
      const reportId = remoteMessage?.data?.reportId ?? remoteMessage?.data?.report_id;
      if (!reportId) return;

      try {
        const token = await AsyncStorage.getItem('access_token');
        const report = await fetchReportById(String(reportId), token || undefined);

        // Role 기반 처리: 부모면 승인 모달, 자녀면 수정 모달(반려인 경우) 또는 상세화면으로 이동
        const role = getCurrentUserRole(); // 'parent' | 'child' | null
        if (role === 'parent') {
          try { useReportApprovalModal.getState().showModal(report); return; } catch (e) { console.warn('showModal error', e); }
        }

        if (role === 'child') {
          // 자녀는 반려된 경우 수정 모달을, 그 외에는 상세 화면으로 이동
          const status = report?.status ?? report?.report_status ?? null;
          if (status === 'REJECTED') {
            try { useReportEditModal.getState().showModal(report); return; } catch (e) { console.warn('showEditModal error', e); }
          }
          // otherwise navigate to detail
          if (navigationRef?.isReady()) {
            try { navigationRef.navigate('ReportDetail', { reportId }); return; } catch (e) { console.warn('navigate error', e); }
          }
        }

        // role이 없거나 알 수 없는 경우: 안전하게 상세 화면으로 이동
        if (navigationRef?.isReady()) {
          try { navigationRef.navigate('ReportDetail', { reportId }); } catch (e) { console.warn('navigate error', e); }
        }
      } catch (e) {
        console.warn('fetchReportById error, falling back to navigation', e);
        if (navigationRef?.isReady()) {
          try { navigationRef.navigate('ReportDetail', { reportId }); } catch (err) { console.warn('navigate error', err); }
        }
      }
    });

    // 앱이 완전히 종료된 상태에서 알림을 탭해 시작된 경우 처리
    (async () => {
      try {
        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage) {
          console.log('FCM initial notification:', initialMessage);
          const reportId = initialMessage?.data?.reportId ?? initialMessage?.data?.report_id;
          if (!reportId) return;

          try {
            const token = await AsyncStorage.getItem('access_token');
            const report = await fetchReportById(String(reportId), token || undefined);
            try {
              const role = getCurrentUserRole();
              if (role === 'parent') {
                useReportApprovalModal.getState().showModal(report);
                return;
              }
              if (role === 'child') {
                const status = report?.status ?? report?.report_status ?? null;
                if (status === 'REJECTED') {
                  useReportEditModal.getState().showModal(report);
                  return;
                }
                if (navigationRef?.isReady()) { navigationRef.navigate('ReportDetail', { reportId }); return; }
              }
              // fallback
              try { useReportApprovalModal.getState().showModal(report); return; } catch (e) { console.warn('showModal initial error', e); }
            } catch (e) { console.warn('initial notification role handling error', e); }
          } catch (e) {
            console.warn('getInitialNotification fetch error, falling back to navigation', e);
          }

          if (navigationRef?.isReady()) {
            try { navigationRef.navigate('ReportDetail', { reportId }); } catch (e) { console.warn('navigate initial error', e); }
          }
        }
      } catch (e) {
        console.warn('getInitialNotification error', e);
      }
    })();

    return () => {
      try { unsubscribeOnOpened(); } catch (e) {}
    };
  }, []);

  // 로딩 중에는 빈 화면 표시 (또는 로딩 인디케이터)
  if (isLoading) {
    return null; // 또는 <LoadingScreen />
  }

  // 네비게이션 구조
  const navigation = (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={"Login"} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
        <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
        <Stack.Screen name="ReportEdit" component={ReportEditScreen} />

        {/* Authentication screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignupType" component={SignupTypeScreen} />
        <Stack.Screen name="SignupConsent" component={SignupConsentScreen} />
        <Stack.Screen name="SignupForm" component={SignupFormScreen} />

        {/* 개발용 설정 및 디버그 화면 */}
        <Stack.Screen name="DevSettings" component={DevSettingsScreen} />
        <Stack.Screen name="DebugNotification" component={DebugNotificationScreen} />
      </Stack.Navigator>
      {/* 네비게이션 내부에 모달 배치 */}
      <NavigationContent />
    </NavigationContainer>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Ensure the Android status bar is white with dark icons for better contrast */}
      <StatusBar backgroundColor="#FFFFFF" barStyle={Platform.OS === 'android' ? 'dark-content' : 'dark-content'} />
      <RouteProvider>
        {/* userId가 있을 때만 WebSocketProvider로 감싸기 */}
        <AppAlertModal />
        {userId ? (
          <WebSocketProvider userId={userId}>
            <AppWithModal>
              {navigation}
            </AppWithModal>
          </WebSocketProvider>
        ) : (
          navigation
        )}
      </RouteProvider>
    </GestureHandlerRootView>
  );
}