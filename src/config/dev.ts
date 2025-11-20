/**
 * 개발 환경 설정 (dev helpers)
 * - 런타임에서 parent/child 토큰을 업데이트할 수 있도록 setter 제공
 * - 빌드 시 .env가 있으면 사용하도록 시도하되, 없으면 기본값 사용
 */

import { Platform } from "react-native";

// Try to load `react-native-config` if available so we can read values from
// a local `.env` at build/runtime. If it's not installed, we'll fall back
// to `process.env` and then to hardcoded defaults.
let RNConfig: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNConfig = require("react-native-config");
} catch (e) {
  RNConfig = null;
}

// 부모/자녀 계정 토큰 (기본 하드코딩, 디버그 편의를 위해 제공)
let parentToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLN1Y2UzFEV0tLTjFXOTJZMVg3WU05NEQiLCJ1c2VyX3R5cGUiOiJwYXJlbnQiLCJyb2xlIjoiVVNFUiIsImV4cCI6MTc2MzM4ODc3Mn0.cDIG06mrW13rMqQpACyqcWu4jKAF6g5x0uO3aDGKwVU";
let childToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLOE1UQUNKMkFaU043WjdFWjFDN1ZFOEEiLCJ1c2VyX3R5cGUiOiJjaGlsZCIsInJvbGUiOiJVU0VSIiwiZXhwIjoxNzYzMzg3MDIyfQ.NlOboZdG8mIuDaeuUIEi0rFuZbCA-ufYgE8eiPs4RKI";

// 현재 기기가 에뮬레이터인지 확인
const isEmulator = (): boolean => {
  if (Platform.OS === "android") {
    const { Brand, Model } = Platform.constants as any;
    return (
      Brand === "google" ||
      Model?.toLowerCase().includes("sdk") ||
      Model?.toLowerCase().includes("emulator")
    );
  } else if (Platform.OS === "ios") {
    return (Platform.constants as any).simulator === true;
  }
  return false;
};

// DEV_TOKEN은 에뮬레이터 여부에 따라 parentToken/childToken을 선택
function computeDevToken(): string | null {
  if (!__DEV__) return null;
  return isEmulator() ? parentToken : childToken;
}

// 런타임에서 parent/child 토큰을 업데이트하는 함수들
export function setParentToken(token: string | null) {
  parentToken = token || "";
}

export function setChildToken(token: string | null) {
  childToken = token || "";
}

// DEV_USER_ID는 런타임에 변경 가능하도록 관리
let devUserId: string | null = __DEV__
  ? isEmulator()
    ? "01K7V6S1DWKKN1W92Y1X7YM94D"
    : "01K8MTACJ2AZSN7Z7EZ1C7VE8A"
  : null;

export function setDevUserId(id: string | null) {
  devUserId = id;
  // keep exported live binding in sync
  DEV_USER_ID = id;
}

// Export a live binding for DEV_USER_ID for backwards compatibility
export let DEV_USER_ID: string | null = devUserId;

console.log(`[DEV_TOKEN] 기기 타입: ${isEmulator() ? "에뮬레이터(부모)" : "실기기(자녀)"}`);
console.log(`[DEV_TOKEN] 사용 userId: ${devUserId}`);
console.log(`[DEV_TOKEN] 사용 토큰: ${computeDevToken() ? computeDevToken()!.substring(0, 50) + "..." : "null"}`);

export const shouldUseDevToken = (): boolean => {
  return __DEV__ && !!computeDevToken();
};

export const getDevToken = (): string | null => {
  return shouldUseDevToken() ? computeDevToken() : null;
};

// Backwards-compatible export for modules that import DEV_TOKEN directly
export const DEV_TOKEN: string | null = getDevToken();

// 환경변수 기반 URL (react-native-config 사용 가능)
const envApiFromRnConfig = RNConfig ? (RNConfig.API_BASE_URL as string | undefined) : undefined;
const envWsFromRnConfig = RNConfig ? (RNConfig.WS_BASE_URL as string | undefined) : undefined;
const envApiFromProc = (process.env.API_BASE_URL as string | undefined) ?? undefined;
const envWsFromProc = (process.env.WS_BASE_URL as string | undefined) ?? undefined;

export const API_BASE_URL = (envApiFromRnConfig ?? envApiFromProc) ?? (__DEV__ ? "http://3.37.169.176:8000" : "https://api.example.com");
export const WS_BASE_URL = (envWsFromRnConfig ?? envWsFromProc) ?? (__DEV__ ? "ws://3.37.169.176:8001" : "wss://ws.example.com");
