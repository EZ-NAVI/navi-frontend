// App.tsx
import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RouteProvider } from "./src/context/RouteContext";

// ✅ 로그인 관련
import LoginScreen from "./src/screens/LoginScreen";

// ✅ 회원가입 관련
import SignupTypeScreen from "./src/screens/SignupTypeScreen";
import SignupConsentScreen from "./src/screens/SignupConsentScreen";
import SignupFormScreen from "./src/screens/SignupFormScreen";

// ✅ 아이디 / 비밀번호 찾기 관련
import FindIdScreen from "./src/screens/FindIdScreen";
import FindPasswordScreen from "./src/screens/FindPasswordScreen";

// ✅ 로그인 후 이동할 메인 지도 화면
import SafeRouteScreen from "./src/screens/SafeRouteScreen";

export type RootStackParamList = {
  Login: undefined;
  SignupType: undefined;
  SignupConsent: undefined;
  SignupForm: undefined;
  FindId: undefined;
  FindPassword: undefined;
  SafeRoute: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#FFFFFF",
  },
};

export default function App() {
  return (
    <RouteProvider>
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          {/* 로그인 */}
          <Stack.Screen name="Login" component={LoginScreen} />

          {/* 회원가입 */}
          <Stack.Screen name="SignupType" component={SignupTypeScreen} />
          <Stack.Screen name="SignupConsent" component={SignupConsentScreen} />
          <Stack.Screen name="SignupForm" component={SignupFormScreen} />

          {/* 아이디 / 비밀번호 찾기 */}
          <Stack.Screen name="FindId" component={FindIdScreen} />
          <Stack.Screen name="FindPassword" component={FindPasswordScreen} />

          {/* 로그인 성공 시 → 지도 화면 */}
          <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </RouteProvider>
  );
}
