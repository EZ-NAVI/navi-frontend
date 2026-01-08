import * as React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar, LogBox, Platform } from "react-native";

// 🚫 디바이스 화면에 뜨는 모든 노란 경고/에러 UI 제거
LogBox.ignoreAllLogs(true);

// 🚫 릴리즈에서는 console.* 자동 비활성화
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

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

import OnboardingScreen from "./src/screens/OnboardingScreen";

import { RouteProvider } from "./src/context/RouteContext";
import { WebSocketProvider } from "./src/context/WebSocketContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { on as onEvent } from "./src/lib/emitter";

import ReportApprovalModal from "./src/components/ReportApprovalModal";
import ReportEditModal from "./src/components/ReportEditModal";
import { useReportApprovalModal } from "./src/stores/reportApprovalModalStore";
import { useReportEditModal } from "./src/stores/reportEditModalStore";

import { postReportReview } from "./src/api/reports";
import { getMe } from "./src/api/auth";

import AppAlertModal from "./src/components/AppAlertModal";
import { useAppAlertStore } from "./src/stores/appAlertStore";

import messaging from "@react-native-firebase/messaging";
import navigationRef from "./src/navigationRef";
import { getCurrentUserRole, setCurrentUserRole } from "./src/lib/authState";

import RNBootSplash from "react-native-bootsplash";

const Stack = createStackNavigator();

// 승인 모달 Wrapper
function AppWithModal({ children }: { children: React.ReactNode }) {
  const { isVisible, reportData, hideModal } = useReportApprovalModal();

  const handleApprove = async () => {
    if (!reportData) return;
    const reportId = reportData.id || reportData.reportId || reportData.report_id;

    try {
      const token = await AsyncStorage.getItem("access_token");
      await postReportReview(reportId, "승인", token || undefined);
      useAppAlertStore.getState().show({
        title: "✅ 승인 완료",
        body: "제보가 승인되었습니다.",
        ctaText: "확인",
      });
      hideModal();
    } catch (error) {}
  };

  const handleReject = async () => {
    if (!reportData) return;
    const reportId = reportData.id || reportData.reportId || reportData.report_id;

    try {
      const token = await AsyncStorage.getItem("access_token");
      await postReportReview(reportId, "반려", token || undefined);
      useAppAlertStore.getState().show({
        title: "❌ 반려 완료",
        body: "제보가 반려되었습니다.\n자녀가 수정할 수 있습니다.",
        ctaText: "확인",
      });
      hideModal();
    } catch (error) {}
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

// Edit 모달 Wrapper
function NavigationContent() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isVisible, reportData, hideModal } = useReportEditModal();

  const handleEdit = () => {
    if (!reportData) return;
    const reportId = reportData.reportId || reportData.report_id || reportData.id;

    hideModal();
    navigation.navigate("ReportEdit", {
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

  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const check = async () => {
      const seen = await AsyncStorage.getItem("has_seen_onboarding");
      setHasSeenOnboarding(seen === "true");
    };
    check();
  }, []);

  React.useEffect(() => {
    RNBootSplash.hide({ fade: true });
  }, []);

  // 앱 시작 시 유저 ID / 토큰 확인
  React.useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        const token = await AsyncStorage.getItem("access_token");
        const storedRole = await AsyncStorage.getItem("user_role");

        if (token) {
          try {
            const me = await getMe();
            const resolvedId = me?.userId ?? me?.id ?? storedUserId ?? null;
            const resolvedRole =
              (me?.user_type || me?.type || me?.userType || storedRole || "")
                .toString()
                .toLowerCase() === "parent"
                ? "parent"
                : (me?.user_type || me?.type || me?.userType || storedRole || "")
                    .toString()
                    .toLowerCase() === "child"
                ? "child"
                : null;

            if (resolvedId) {
              setUserId(String(resolvedId));
            } else {
              await AsyncStorage.multiRemove(["access_token", "user_id"]);
            }

            setCurrentUserRole(resolvedRole);
            if (resolvedRole) {
              await AsyncStorage.setItem("user_role", resolvedRole);
            }
          } catch (error) {
            await AsyncStorage.multiRemove(["access_token", "user_id"]);
            setCurrentUserRole(null);
          }
        } else {
          setCurrentUserRole(null);
        }
      } catch (error) {
        setCurrentUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserId();

    const unsubscribe = onEvent("user:changed", (newId: any) => {
      setUserId(newId ? String(newId) : null);
    });

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  if (isLoading || hasSeenOnboarding === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"}
      />
      <RouteProvider>
        <WebSocketProvider userId={userId || ''}>
          <AppAlertModal />
          <NavigationContainer ref={navigationRef}>
            <AppWithModal>
              <Stack.Navigator
                initialRouteName={hasSeenOnboarding ? "Login" : "Onboarding"}
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />

                <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
                <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
                <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
                <Stack.Screen name="ReportEdit" component={ReportEditScreen} />

                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignupType" component={SignupTypeScreen} />
                <Stack.Screen name="SignupConsent" component={SignupConsentScreen} />
                <Stack.Screen name="SignupForm" component={SignupFormScreen} />

                <Stack.Screen name="DevSettings" component={DevSettingsScreen} />
                <Stack.Screen name="DebugNotification" component={DebugNotificationScreen} />
              </Stack.Navigator>
              <NavigationContent />
            </AppWithModal>
          </NavigationContainer>
        </WebSocketProvider>
      </RouteProvider>
    </GestureHandlerRootView>
  );
}
