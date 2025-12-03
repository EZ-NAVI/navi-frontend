// FCM 관련 유틸리티 함수들을 구현한다.
// 전제:
// - @react-native-firebase/messaging, @react-native-firebase/app 이 이미 설치되어 있다.
// 해야 할 것:
// 1) requestNotificationPermission(): 알림 권한을 요청하고, 허용되었는지 boolean을 반환한다.
// 2) getFcmToken(): registerDeviceForRemoteMessages를 호출한 뒤, messaging().getToken()으로 FCM 토큰을 가져온다.
// 3) registerFcmTokenToServer(token: string): axios를 사용해서 POST /users/fcm-token API를 호출한다.
//    - 요청 바디에는 { fcmToken: token, platform: Platform.OS } 형식으로 보낸다.
// TypeScript로 작성한다.

import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import client from '../api/client';

/**
 * 알림 권한을 요청하고, 허용되었는지 boolean을 반환한다.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('FCM 알림 권한이 허용되었습니다:', authStatus);
    } else {
      console.log('FCM 알림 권한이 거부되었습니다:', authStatus);
    }

    return enabled;
  } catch (error) {
    console.error('FCM 알림 권한 요청 중 오류:', error);
    return false;
  }
}

/**
 * FCM 토큰을 가져온다.
 * registerDeviceForRemoteMessages를 먼저 호출한 뒤, messaging().getToken()으로 토큰을 반환한다.
 */
export async function getFcmToken(): Promise<string | null> {
  try {
    // iOS의 경우 필수, Android는 무해함
    await messaging().registerDeviceForRemoteMessages();
    
    const token = await messaging().getToken();
    console.log('FCM TOKEN:', token);
    
    return token;
  } catch (error) {
    console.error('FCM 토큰 가져오기 실패:', error);
    return null;
  }
}

/**
 * FCM 토큰을 서버에 등록한다.
 * POST /users/fcm-token API를 호출하여 토큰과 플랫폼 정보를 전송한다.
 */
export async function registerFcmTokenToServer(token: string): Promise<void> {
  try {
    // 서버가 snake_case 'fcm_token'을 기대하므로 둘 다 안전하게 보낸다.
    const body = {
      // primary expected by backend
      fcm_token: token,
      // keep legacy camelCase too in case some endpoints expect it
      fcmToken: token,
      platform: Platform.OS,
    };
    console.log('POST /users/fcm-token body:', body);
    const res = await client.post('/users/fcm-token', body);
    console.log('FCM 토큰이 서버에 등록되었습니다. response:', res?.data);
  } catch (error) {
    // axios error일 경우 서버 응답 내용을 자세히 로깅한다.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = error;
      if (err?.response) {
        console.error('FCM 토큰 서버 등록 실패 status:', err.response.status, 'data:', err.response.data);
      } else {
        console.error('FCM 토큰 서버 등록 실패 (no response):', err);
      }
    } catch (logErr) {
      console.error('FCM 토큰 서버 등록 실패(로깅 중 에러):', logErr);
    }
    throw error;
  }
}
