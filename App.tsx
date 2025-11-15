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
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator, StackNavigationProp } from "@react-navigation/stack";
import SafeRouteScreen from "./src/screens/SafeRouteScreen";
import LocationSearchScreen from "./src/screens/LocationSearchScreen";
import ReportDetailScreen from "./src/screens/ReportDetailScreen";
import ReportEditScreen from "./src/screens/ReportEditScreen";
import { RouteProvider } from "./src/context/RouteContext";
import { WebSocketProvider, WebSocketContext } from "./src/context/WebSocketContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEV_USER_ID } from "./src/config/dev";
import ReportApprovalModal from "./src/components/ReportApprovalModal";
import ReportEditModal from "./src/components/ReportEditModal";
import { useReportApprovalModal } from "./src/stores/reportApprovalModalStore";
import { useReportEditModal } from "./src/stores/reportEditModalStore";
import { postReportReview } from "./src/api/reports";
import { Alert } from "react-native";

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
      Alert.alert('✅ 승인 완료', '제보가 승인되었습니다.');
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
      Alert.alert('❌ 반려 완료', '제보가 반려되었습니다.\n자녀가 수정할 수 있습니다.');
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
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // 앱 시작 시 로그인된 유저 ID 가져오기
  React.useEffect(() => {
    const loadUserId = async () => {
      try {
        // TODO: 실제 authStore나 useAuthUser 훅으로 대체 필요
        // const user = authStore.getState().user;
        // setUserId(user?.id || null);
        
        // ⚠️ 개발 환경: 항상 DEV_USER_ID를 사용하고 AsyncStorage 업데이트
        if (DEV_USER_ID) {
          await AsyncStorage.setItem('user_id', DEV_USER_ID);
          console.log('[App] DEV_USER_ID를 AsyncStorage에 저장:', DEV_USER_ID);
          setUserId(DEV_USER_ID);
        } else {
          // 프로덕션: AsyncStorage에서 가져오기
          const storedUserId = await AsyncStorage.getItem('user_id');
          console.log('[App] 사용할 userId:', storedUserId);
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('[App] userId 로드 실패:', error);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserId();
  }, []);

  // 로딩 중에는 빈 화면 표시 (또는 로딩 인디케이터)
  if (isLoading) {
    return null; // 또는 <LoadingScreen />
  }

  // 네비게이션 구조
  const navigation = (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
        <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
        <Stack.Screen name="ReportEdit" component={ReportEditScreen} />
      </Stack.Navigator>
      {/* 네비게이션 내부에 모달 배치 */}
      <NavigationContent />
    </NavigationContainer>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RouteProvider>
        {/* userId가 있을 때만 WebSocketProvider로 감싸기 */}
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