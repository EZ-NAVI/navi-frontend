// FCM 토큰을 임시로 등록하기 위한 디버그용 화면을 만든다.
// ⚠️ 나중에 로그인 페이지가 완성되면, 여기에서 구현하는 로직은
//    로그인 성공 시(afterLoginSuccess)로 옮길 예정이기 때문에 구조를 단순하게 유지한다.
//
// 요구사항:
// - React Native 함수형 컴포넌트 DebugNotificationScreen을 만든다.
// - 화면에는 "FCM 토큰 등록하기 (임시)" 라는 제목의 버튼 하나만 있으면 된다.
// - 버튼을 누르면 다음 순서로 동작한다:
//   1) requestNotificationPermission()을 호출해서 알림 권한을 요청한다.
//      - 권한이 허용되지 않으면 그냥 리턴한다.
//   2) getFcmToken()을 호출해서 FCM 토큰을 가져온다.
//   3) 토큰이 있으면 registerFcmTokenToServer(token)을 호출해서 백엔드의 /users/fcm-token API를 통해 등록한다.
// - requestNotificationPermission, getFcmToken, registerFcmTokenToServer 는 ../lib/fcm 에서 import 해서 사용한다.
// - TypeScript로 작성하고, default export 한다.
// - 이 컴포넌트는 추후 로그인 플로우가 완성되면 삭제하거나 로그인 성공 로직으로 옮길 예정이라는 TODO 주석을 남긴다.

import React, { useState } from 'react';
import { View, Button, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { requestNotificationPermission, getFcmToken, registerFcmTokenToServer } from '../lib/fcm';

// TODO: 로그인 성공(afterLoginSuccess) 시점으로 FCM 토큰 등록 로직을 이동하고 이 화면은 제거할 예정.
const DebugNotificationScreen: React.FC = () => {
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);

	const handleRegister = async () => {
		if (loading) return;
		setLoading(true);
		setStatus(null);
		setToken(null);
		try {
			// 1) 권한 요청
			const permitted = await requestNotificationPermission();
			if (!permitted) {
				setStatus('알림 권한이 거부되어 토큰 등록을 중지합니다.');
				return;
			}

			// 2) FCM 토큰 획득
			const fetchedToken = await getFcmToken();
			if (!fetchedToken) {
				setStatus('FCM 토큰을 가져오지 못했습니다.');
				return;
			}
			setToken(fetchedToken);

			// 3) 서버 등록
			await registerFcmTokenToServer(fetchedToken);
			setStatus('FCM 토큰이 서버에 성공적으로 등록되었습니다.');
			} catch (error: any) {
				console.error(error);
				// 서버가 반환한 자세한 에러 메시지가 있으면 보여주기
				const serverMsg = error?.response?.data ? JSON.stringify(error.response.data) : null;
				if (serverMsg) {
					setStatus(`서버 등록 실패: ${serverMsg}`);
				} else if (error?.message) {
					setStatus(`FCM 토큰 등록 중 오류: ${error.message}`);
				} else {
					setStatus('FCM 토큰 등록 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.');
				}
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Button title="FCM 토큰 등록하기 (임시)" onPress={handleRegister} disabled={loading} />
			<View style={styles.feedback}>
				{loading && <ActivityIndicator />}
				{status && <Text style={styles.status}>{status}</Text>}
				{token && <Text style={styles.token} selectable>{token}</Text>}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		justifyContent: 'center',
	},
	feedback: {
		marginTop: 16,
		gap: 8,
	},
	status: {
		fontSize: 14,
		color: '#333',
	},
	token: {
		fontSize: 12,
		color: '#555',
	},
});

export default DebugNotificationScreen;

