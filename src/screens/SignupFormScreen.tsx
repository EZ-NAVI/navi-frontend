// src/screens/SignupFormScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {api} from '../api/api';

// ⭐ CustomAlert 추가
import CustomAlert from '../components/CustomAlert';

export default function SignupFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {userType} = (route.params as any) || {userType: 'parent'};
  const isParent = userType === 'parent';

  // 본인 정보
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [birthYear, setBirthYear] = useState('');

  // 매칭 대상 정보
  const [relName, setRelName] = useState('');
  const [relBirth, setRelBirth] = useState('');
  const [relPhone, setRelPhone] = useState('');
  const [relEmail, setRelEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ⭐ CustomAlert 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  const openAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertVisible(true);
  };

  // ----------------------------
  //   🔍 형식 검증
  // ----------------------------
  const isValidPhone = (value: string) =>
    /^01[016789]-\d{3,4}-\d{4}$/.test(value.trim());
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const isValidBirthYear = (value: string) =>
    /^\d{4}$/.test(value) &&
    Number(value) >= 1900 &&
    Number(value) <= new Date().getFullYear();

  const validateForm = () => {
    if (
      !name ||
      !phone ||
      !email ||
      !pw ||
      !birthYear ||
      !relName ||
      !relBirth ||
      !relPhone ||
      !relEmail
    ) {
      openAlert('입력 확인', '모든 항목을 입력해주세요.');
      return false;
    }
    if (!isValidPhone(phone)) {
      openAlert(
        '형식 오류',
        '휴대폰 번호 형식이 올바르지 않습니다.\n예: 010-1234-5678',
      );
      return false;
    }
    if (!isValidEmail(email)) {
      openAlert('형식 오류', '이메일 형식이 올바르지 않습니다.');
      return false;
    }
    if (!isValidBirthYear(birthYear)) {
      openAlert('형식 오류', '출생년도는 4자리 숫자로 입력해주세요.');
      return false;
    }
    if (!isValidPhone(relPhone)) {
      openAlert(
        '형식 오류',
        '매칭 대상의 휴대폰 번호 형식이 올바르지 않습니다.',
      );
      return false;
    }
    if (!isValidEmail(relEmail)) {
      openAlert('형식 오류', '매칭 대상의 이메일 형식이 올바르지 않습니다.');
      return false;
    }
    if (!isValidBirthYear(relBirth)) {
      openAlert(
        '형식 오류',
        '매칭 대상의 출생년도는 4자리 숫자로 입력해주세요.',
      );
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      user_type: String(userType),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: pw,
      birth_year: Number(birthYear) || 0,
      parent_info: isParent
        ? {}
        : {
            name: relName.trim(),
            birth_year: Number(relBirth) || 0,
            phone: relPhone.trim(),
            email: relEmail.trim(),
          },
      child_info: isParent
        ? {
            name: relName.trim(),
            birth_year: Number(relBirth) || 0,
            phone: relPhone.trim(),
            email: relEmail.trim(),
          }
        : {},
    };

    try {
      setSubmitting(true);

      // ✅ 서버 응답에서 matched 필드를 직접 받음
      const res = await api.register(payload);

      if (res.matched) {
        openAlert(
          '가입 완료',
          isParent
            ? '회원가입이 완료되었습니다.\n자녀와 매칭되었어요!'
            : '회원가입이 완료되었습니다.\n부모님과 매칭되었어요!',
        );
      } else {
        openAlert(
          '가입 완료',
          isParent
            ? '회원가입이 완료되었습니다.\n자녀가 아직 가입을 안 했어요.'
            : '회원가입이 완료되었습니다.\n부모님이 아직 가입을 안 하셨어요.',
        );
      }

      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    } catch (err: any) {
      openAlert('가입 실패', String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: '#FFFFFF'}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        {/* 🔙 뒤로가기 */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기">
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>

        {/* 중앙 로고 */}
        <View style={styles.header}>
          <Text style={styles.logoText}>NAVI</Text>
          <Text style={styles.title}>회원 정보 입력</Text>
        </View>

        <View style={styles.form}>
          {/* 본인 정보 */}
          <TextInput
            placeholder="이름"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="휴대폰 번호 (010-0000-0000)"
            placeholderTextColor="#A0A0A0"
            keyboardType="phone-pad"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            placeholder="이메일 (user@example.com)"
            placeholderTextColor="#A0A0A0"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="비밀번호"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            style={styles.input}
            value={pw}
            onChangeText={setPw}
          />
          <TextInput
            placeholder="출생년도 (예: 2012)"
            placeholderTextColor="#A0A0A0"
            keyboardType="number-pad"
            style={styles.input}
            value={birthYear}
            onChangeText={setBirthYear}
            maxLength={4}
          />

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 부모/자녀 정보 */}
          <Text style={styles.sectionTitle}>
            {isParent
              ? '매칭될 자녀 정보를 입력해 주세요!'
              : '매칭될 부모님 정보를 입력해 주세요!'}
          </Text>

          <TextInput
            placeholder={`${isParent ? '자녀' : '부모님'} 이름`}
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={relName}
            onChangeText={setRelName}
          />
          <TextInput
            placeholder="출생년도 (예: 2012)"
            placeholderTextColor="#A0A0A0"
            keyboardType="number-pad"
            style={styles.input}
            value={relBirth}
            onChangeText={setRelBirth}
            maxLength={4}
          />
          <TextInput
            placeholder={`${
              isParent ? '자녀' : '부모님'
            } 휴대폰 번호 (010-0000-0000)`}
            placeholderTextColor="#A0A0A0"
            keyboardType="phone-pad"
            style={styles.input}
            value={relPhone}
            onChangeText={setRelPhone}
          />
          <TextInput
            placeholder={`${
              isParent ? '자녀' : '부모님'
            } 이메일 (user@example.com)`}
            placeholderTextColor="#A0A0A0"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={relEmail}
            onChangeText={setRelEmail}
          />

          {/* 가입 완료 */}
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            disabled={submitting}
            onPress={onSubmit}>
            <Text style={styles.primaryBtnText}>
              {submitting ? '처리 중...' : '가입 완료'}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 5,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    marginTop: 20,
    marginBottom: -2,
  },
  divider: {
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 25,
    marginBottom: 10,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFDE59',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnDisabled: {backgroundColor: '#DADADA', shadowOpacity: 0},
  primaryBtnText: {fontSize: 16, fontWeight: '700', color: '#000'},
});
