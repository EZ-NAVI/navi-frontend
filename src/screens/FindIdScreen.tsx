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

export default function FindIdScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const onFind = () => {
    if (!name || !phone) {
      Alert.alert("입력 확인", "이름과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    Alert.alert("아이디 찾기", `회원님의 아이디는 example@gmail.com (예시)`);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>NAVI</Text>
          <Text style={styles.title}>아이디 찾기</Text>
        </View>

        <View style={styles.form}>
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
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={onFind}>
            <Text style={styles.primaryBtnText}>아이디 찾기</Text>
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
