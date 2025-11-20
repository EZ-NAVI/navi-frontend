/**
 * 개발 환경 설정
 * - DEV_TOKEN: 개발용 임시 인증 토큰
 * - 실제 배포 시에는 사용되지 않음 (__DEV__ 체크)
 * - 실기기(부모)와 에뮬레이터(자녀)를 자동으로 구분
 */

import { Platform } from 'react-native';

// Try to load `react-native-config` if available so we can read values from
// a local `.env` at build/runtime. If it's not installed, we'll fall back
// to `process.env` and then to hardcoded defaults.
let RNConfig: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNConfig = require('react-native-config');
} catch (e) {
  RNConfig = null;
}

// 부모 계정 토큰
const PARENT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLN1Y2UzFEV0tLTjFXOTJZMVg3WU05NEQiLCJ1c2VyX3R5cGUiOiJwYXJlbnQiLCJyb2xlIjoiVVNFUiIsImV4cCI6MTc2MzM4ODc3Mn0.cDIG06mrW13rMqQpACyqcWu4jKAF6g5x0uO3aDGKwVU";

// 자녀 계정 토큰 
const CHILD_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLOE1UQUNKMkFaU043WjdFWjFDN1ZFOEEiLCJ1c2VyX3R5cGUiOiJjaGlsZCIsInJvbGUiOiJVU0VSIiwiZXhwIjoxNzYzMzg3MDIyfQ.NlOboZdG8mIuDaeuUIEi0rFuZbCA-ufYgE8eiPs4RKI";

/**
 * 현재 기기가 에뮬레이터인지 확인
 * - Android: Platform.constants.Brand === 'google' && Platform.constants.Model.includes('sdk')
 * - iOS: Platform.constants.simulator === true
 */
const isEmulator = (): boolean => {
  if (Platform.OS === 'android') {
    // Android 에뮬레이터 감지
    const { Brand, Model } = Platform.constants as any;
    return (
      Brand === 'google' || 
      Model?.toLowerCase().includes('sdk') || 
      Model?.toLowerCase().includes('emulator')
    );
  } else if (Platform.OS === 'ios') {
    // iOS 시뮬레이터 감지
    return (Platform.constants as any).simulator === true;
  }
  return false;
};

// 기기 타입에 따라 자동으로 토큰 선택
// ✅ 개발 편의: 에뮬레이터를 부모 계정으로, 실기기를 자녀 계정으로 사용합니다.
// 따라서 isEmulator() === true 이면 EMULATOR(부모) 토큰/ID를 반환해야 합니다.
export const DEV_TOKEN = __DEV__
  ? (isEmulator() ? PARENT_TOKEN : CHILD_TOKEN)
  : null;

// 토큰에서 userId 추출 (개발용)
// ✅ 에뮬레이터 = 부모, 실기기 = 자녀
export const DEV_USER_ID = __DEV__
  ? (isEmulator()
      ? "01K7V6S1DWKKN1W92Y1X7YM94D"  // 부모 userId (에뮬레이터)
      : "01K8MTACJ2AZSN7Z7EZ1C7VE8A") // 자녀 userId (실기기)
  : null;

console.log(`[DEV_TOKEN] 기기 타입: ${isEmulator() ? '에뮬레이터(부모)' : '실기기(자녀)'}`);
console.log(`[DEV_TOKEN] 사용 userId: ${DEV_USER_ID}`);
console.log(`[DEV_TOKEN] 사용 토큰: ${DEV_TOKEN ? DEV_TOKEN.substring(0, 50) + '...' : 'null'}`);

/**
 * 개발용 토큰 사용 여부 확인
 * - 개발 환경이고 토큰이 설정되어 있으면 true
 */
export const shouldUseDevToken = (): boolean => {
  return __DEV__ && DEV_TOKEN !== null;
};

/**
 * 개발용 토큰 가져오기
 * - 개발 환경에서만 반환, 프로덕션에서는 null
 */
export const getDevToken = (): string | null => {
  return shouldUseDevToken() ? DEV_TOKEN : null;
};

/**
 * 개발 환경에서 사용하는 백엔드 베이스 URL과 WebSocket URL
 * - 필요 시 production 값으로 대체하거나 환경변수/CI 시크릿에서 주입하도록 확장 가능합니다.
 */
// Allow overriding via environment variables (set in CI or local `.env`).
// Note: React Native doesn't expose `process.env` by default at runtime —
// these env vars are intended to be injected at build time (CI) or via
// libraries like `react-native-config`. If not provided, fall back to
// sensible defaults for dev/prod.
// Prefer values from react-native-config (.env), then process.env, then defaults
const envApiFromRnConfig = RNConfig ? (RNConfig.API_BASE_URL as string | undefined) : undefined;
const envWsFromRnConfig = RNConfig ? (RNConfig.WS_BASE_URL as string | undefined) : undefined;
const envApiFromProc = (process.env.API_BASE_URL as string | undefined) ?? undefined;
const envWsFromProc = (process.env.WS_BASE_URL as string | undefined) ?? undefined;

export const API_BASE_URL = (envApiFromRnConfig ?? envApiFromProc) ?? (__DEV__ ? 'http://3.37.169.176:8000' : 'https://api.example.com');
export const WS_BASE_URL = (envWsFromRnConfig ?? envWsFromProc) ?? (__DEV__ ? 'ws://3.37.169.176:8001' : 'wss://ws.example.com');
