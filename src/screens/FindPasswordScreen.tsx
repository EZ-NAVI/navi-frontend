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
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function FindPasswordScreen() {
  const navigation = useNavigation<any>();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");

  const onSend = () => {
    if (!id || !email) {
      Alert.alert("입력 확인", "아이디와 이메일을 입력해 주세요.");
      return;
    }
    Alert.alert("안내", "비밀번호 재설정 링크를 이메일로 발송했습니다. (예시)");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>NAVI</Text>
          <Text style={styles.title}>비밀번호 찾기</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="아이디"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={id}
            onChangeText={setId}
          />
          <TextInput
            placeholder="가입 이메일 (example@naver.com)"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={onSend}>
            <Text style={styles.primaryBtnText}>재설정 링크 발송</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>로그인 화면으로 돌아가기</Text>
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
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  logoText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFDE59",
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
    color: "#000",
  },
  form: {
    width: "100%",
    gap: 15,
  },
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
  primaryBtn: {
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
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  backBtn: {
    alignSelf: "center",
    marginTop: 25,
  },
  backText: {
    fontSize: 13,
    color: "#777",
  },
});
