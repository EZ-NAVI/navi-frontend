/**
 * 개발 환경 설정
 * - DEV_TOKEN: 개발용 임시 인증 토큰
 * - 실제 배포 시에는 사용되지 않음 (__DEV__ 체크)
 * - 실기기(부모)와 에뮬레이터(자녀)를 자동으로 구분
 */

import { Platform } from 'react-native';

// 부모 계정 토큰 (실기기용)
const PARENT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLN1Y2UzFEV0tLTjFXOTJZMVg3WU05NEQiLCJ1c2VyX3R5cGUiOiJwYXJlbnQiLCJyb2xlIjoiVVNFUiIsImV4cCI6MTc2MzI0MzI4MH0.xoUJJjAWttjFghcUz7cEQUlYfTcOiCf3NFmI_WNTQXU";

// 자녀 계정 토큰 (에뮬레이터용)
const CHILD_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLOE1UQUNKMkFaU043WjdFWjFDN1ZFOEEiLCJ1c2VyX3R5cGUiOiJjaGlsZCIsInJvbGUiOiJVU0VSIiwiZXhwIjoxNzYzMjQzMzIyfQ.rYPbP6GZNiC9IF-scHFcrzj5I9OP9zrzXTPStUtaE08";

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
// ✅ 실기기 = 자녀, 에뮬레이터 = 부모
export const DEV_TOKEN = __DEV__
  ? (!isEmulator() ? CHILD_TOKEN : PARENT_TOKEN)
  : null;

// 토큰에서 userId 추출 (개발용)
// ✅ 실기기 = 자녀, 에뮬레이터 = 부모
export const DEV_USER_ID = __DEV__
  ? (!isEmulator() 
      ? "01K8MTACJ2AZSN7Z7EZ1C7VE8A"  // 자녀 userId (실기기)
      : "01K7V6S1DWKKN1W92Y1X7YM94D") // 부모 userId (에뮬레이터)
  : null;

console.log(`[DEV_TOKEN] 기기 타입: ${!isEmulator() ? '실기기(자녀)' : '에뮬레이터(부모)'}`);
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
