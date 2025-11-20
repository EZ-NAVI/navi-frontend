/**
 * @format
 */

// FCM 백그라운드 메시지 핸들러를 등록한다.
// - @react-native-firebase/messaging을 import 한다.
// - messaging().setBackgroundMessageHandler를 사용해 remoteMessage를 로그로 출력한다.
import messaging from '@react-native-firebase/messaging';

// 백그라운드에서 수신된 푸시 메시지를 처리합니다. 이 코드는 앱이 포그라운드가 아닐 때도 실행됩니다.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
	try {
		console.log('FCM background message received:', remoteMessage);
	} catch (e) {
		console.error('Error in background message handler:', e);
	}
});

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
