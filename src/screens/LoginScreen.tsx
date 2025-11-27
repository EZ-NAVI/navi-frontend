// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../api/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emit } from '../lib/emitter';
import { requestNotificationPermission, getFcmToken, registerFcmTokenToServer } from '../lib/fcm';
import { setParentToken, setChildToken, setDevUserId, setDevRole } from "../config/dev";
import { setCurrentUserRole } from '../lib/authState';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("입력 확인", "아이디(이메일)과 비밀번호를 입력해주세요.");
      return;
    }
    try {
      setLoading(true);
      // 1) 로그인
      const loginResp = await api.login(email.trim(), password);
      // 2) 프로필 확인
      const me = await api.me();

      // 3) 개발용 토큰 업데이트: 로그인한 사용자의 토큰을 parent/child 슬롯에 저장
      const token = loginResp?.access_token ?? null;
      // Backend may return different key names: user_type, type, or userType
      const userType = me?.user_type ?? me?.type ?? me?.userType ?? null;

      // 디버그: /users/me 전체 응답을 출력해서 정확한 필드 확인
      try {
        console.log('[Login] /users/me response:', JSON.stringify(me));
      } catch (e) {
        console.log('[Login] /users/me response (non-serializable):', me);
      }

      // 로그인 응답으로 받은 userType을 터미널에 출력(디버그용)
      if (userType) {
        console.log(`[Login] user_type from /users/me: ${String(userType)}`);
      } else {
        console.log('[Login] user_type was not provided by /users/me');
      }
      if (token) {
        if (typeof userType === "string" && userType.toLowerCase() === "parent") {
          setParentToken(token);
          setDevRole('parent');
          setCurrentUserRole('parent');
          try { await AsyncStorage.setItem('user_role', 'parent'); } catch (e) { /* ignore */ }
        } else if (typeof userType === "string" && userType.toLowerCase() === "child") {
          setChildToken(token);
          setDevRole('child');
          setCurrentUserRole('child');
          try { await AsyncStorage.setItem('user_role', 'child'); } catch (e) { /* ignore */ }
        }
      }
      // dev helper에서 사용할 userId도 설정 (백엔드가 userId 또는 id 중 하나를 반환할 수 있음)
      const resolvedUserId = me?.userId ?? me?.id ?? null;
      setDevUserId(resolvedUserId);
      // AsyncStorage에도 저장해서 App 초기화/다른 모듈에서 사용할 수 있게 함
      try {
        if (resolvedUserId) {
          await AsyncStorage.setItem('user_id', String(resolvedUserId));
          // notify app that userId changed so WebSocketProvider can mount immediately
          try { emit('user:changed', String(resolvedUserId)); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.warn('[Login] user_id AsyncStorage 저장 실패:', e);
      }
      // FCM 권한 요청 및 토큰 취득/서버 등록
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          const fcmToken = await getFcmToken();
          if (fcmToken) {
            try {
              await registerFcmTokenToServer(fcmToken);
              try { await AsyncStorage.setItem('fcm_token', fcmToken); } catch (e) { /* ignore */ }
            } catch (regErr) {
              console.warn('[Login] FCM 토큰 서버 등록 실패:', regErr);
            }
          } else {
            console.warn('[Login] FCM 토큰을 가져오지 못했습니다.');
          }
        } else {
          console.log('[Login] 알림 권한 거부됨 — FCM 토큰 등록하지 않음.');
        }
      } catch (fcmErr) {
        console.error('[Login] FCM 처리 중 오류:', fcmErr);
      }
      // 필요하면 me를 전역/상태에 보관
      // 3) 이동
      navigation.reset({ index: 0, routes: [{ name: "SafeRoute" }] });
    } catch (err: any) {
      Alert.alert("로그인 실패", String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* 상단 로고/타이틀 */}
        <View style={styles.header}>
          <Text style={styles.logoText}>NAVI</Text>
          <Text style={styles.title}>로그인</Text>
        </View>

        {/* 입력 필드 */}
        <View style={styles.form}>
          <TextInput
            placeholder="아이디(이메일)"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="비밀번호"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.loginBtnText}>로그인하기</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 하단 링크 */}
        <View style={styles.footer}>
          {/* 🔸 아이디 / 비밀번호 찾기 버튼은 후순위로 미룸 */}
          {/**
          <TouchableOpacity onPress={() => navigation.navigate("FindId")}>
            <Text style={styles.footerText}>아이디 찾기</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => navigation.navigate("FindPassword")}>
            <Text style={styles.footerText}>비밀번호 찾기</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          */}

          {/* 🔹 회원가입만 남기기 */}
          <TouchableOpacity onPress={() => navigation.navigate("SignupType") }>
            <Text style={[styles.footerText, { color: "#000" }]}> 
              NAVI는 처음이신가요?
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  header: { alignItems: "center", marginBottom: 50 },
  logoText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFDE59",
    letterSpacing: 2,
  },
  title: { fontSize: 22, fontWeight: "700", marginTop: 6, color: "#000" },
  form: { width: "100%", gap: 15 },
  input: {
    width: "100%",
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  loginBtn: {
    backgroundColor: "#FFDE59",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnText: { fontSize: 17, fontWeight: "bold", color: "#000" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 35,
  },
  footerText: { fontSize: 13, color: "#777" },
  divider: { width: 1, height: 12, backgroundColor: "#DDD", marginHorizontal: 10 },
});
