// src/screens/LoginScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {login as authLogin, getMe as authGetMe} from '../api/auth';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {emit} from '../lib/emitter';
import {
  requestNotificationPermission,
  getFcmToken,
  registerFcmTokenToServer,
} from '../lib/fcm';
import {
  setParentToken,
  setChildToken,
  setDevUserId,
  setDevRole,
} from '../config/dev';
import {setCurrentUserRole} from '../lib/authState';
import CustomAlert from '../components/CustomAlert';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ⭐ 커스텀 알림 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertTitle, setAlertTitle] = useState('알림');

  const openAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      openAlert('입력 확인', '아이디(이메일)과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      setLoading(true);
      const loginResp = await authLogin(email.trim(), password);

      // 서버가 로그인 응답에 access_token을 주기 때문에, AsyncStorage에
      // 저장된 값을 읽기 전에 바로 /users/me를 호출해야 할 수 있습니다.
      // 그러므로 가능한 경우 loginResp.access_token을 이용해 직접 Authorization
      // 헤더를 붙여서 /users/me를 호출합니다. 이렇게 하면 AsyncStorage 쓰기/읽기
      // 타이밍으로 인한 race condition을 피할 수 있습니다.
      let me: any = null;
      const tokenFromLogin = loginResp?.access_token ?? null;
      // 안전성: auth.login 내부에서 AsyncStorage에 저장했더라도 확실히 반영되도록
      // 여기서도 한 번 더 명시적으로 저장합니다.
      if (tokenFromLogin) {
        try {
          await AsyncStorage.setItem('access_token', tokenFromLogin);
          if (loginResp?.token_type) {
            await AsyncStorage.setItem('token_type', loginResp.token_type);
          }
          console.log('[Login] AsyncStorage에 토큰 저장 완료');
        } catch (e) {
          console.warn('[Login] AsyncStorage 토큰 저장 실패', e);
        }
      }
      if (tokenFromLogin) {
        try {
          const resp = await client.get('/users/me', {
            headers: {Authorization: `Bearer ${tokenFromLogin}`},
          });
          me = resp?.data;
        } catch (err) {
          // fallback to authGetMe which relies on AsyncStorage/interceptor
          try {
            me = await authGetMe();
          } catch (e) {
            throw e;
          }
        }
      } else {
        me = await authGetMe();
      }
      const token = loginResp?.access_token ?? null;
      const userType = me?.user_type ?? me?.type ?? me?.userType ?? null;

      console.log('[Login] /users/me response:', me);

      if (token) {
        if (String(userType).toLowerCase() === 'parent') {
          setParentToken(token);
          setDevRole('parent');
          setCurrentUserRole('parent');
          await AsyncStorage.setItem('user_role', 'parent');
        } else {
          setChildToken(token);
          setDevRole('child');
          setCurrentUserRole('child');
          await AsyncStorage.setItem('user_role', 'child');
        }
      }

      const resolvedUserId = me?.userId ?? me?.id ?? null;
      setDevUserId(resolvedUserId);

      if (resolvedUserId) {
        await AsyncStorage.setItem('user_id', String(resolvedUserId));
        emit('user:changed', String(resolvedUserId));
      }

      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          const fcmToken = await getFcmToken();
          if (fcmToken) {
            await registerFcmTokenToServer(fcmToken);
            await AsyncStorage.setItem('fcm_token', fcmToken);
          }
        }
      } catch (e) {}

      await AsyncStorage.removeItem('map_notice_shown');
      await AsyncStorage.removeItem('session_started');

      navigation.reset({index: 0, routes: [{name: 'SafeRoute'}]});
    } catch (err: any) {
      // 영어 메시지 → 한글 메시지로 고정 변경
      openAlert('로그인 실패', '아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ⭐ 게스트 모드: 알림은 그대로 → CustomAlert 사용
  const handleGuestMode = async () => {
    openAlert(
      '안내',
      '체험해보기 상태인 경우, 제보 기능을 확인 및 사용할 수 없어요!',
    );

    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user_id');
    await AsyncStorage.removeItem('user_role');
    await AsyncStorage.removeItem('fcm_token');

    await AsyncStorage.removeItem('map_notice_shown');
    await AsyncStorage.removeItem('session_started');

    navigation.reset({
      index: 0,
      routes: [{name: 'SafeRoute'}],
    });
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: '#FFFFFF'}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handleGuestMode}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="체험해보기">
        <Text style={styles.skipBtnText}>체험해보기</Text>
        <Icon name="chevron-forward-outline" size={18} color="#777" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>NAVI</Text>
          <Text style={styles.title}>로그인</Text>
        </View>

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
            style={[styles.loginBtn, loading && {opacity: 0.6}]}
            onPress={handleLogin}
            disabled={loading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="로그인">
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.loginBtnText}>로그인하기</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignupType')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="회원가입"
            accessibilityHint="회원가입 페이지로 이동합니다">
            <Text style={[styles.footerText, {color: '#000'}]}>
              NAVI는 처음이신가요?
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMsg}
        onClose={() => setAlertVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },

  skipBtn: {
    position: 'absolute',
    top: 45,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    zIndex: 20,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 3,
  },

  header: {alignItems: 'center', marginBottom: 50},
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFDE59',
    letterSpacing: 2,
  },
  title: {fontSize: 22, fontWeight: '700', marginTop: 6, color: '#000'},

  form: {width: '100%', gap: 15},
  input: {
    width: '100%',
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loginBtn: {
    backgroundColor: '#FFDE59',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 25,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnText: {fontSize: 17, fontWeight: 'bold', color: '#000'},

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },
  footerText: {fontSize: 13, color: '#777'},
});
