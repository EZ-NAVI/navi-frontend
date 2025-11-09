import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

export default function SignupConsentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userType } = route.params || { userType: "parent" };

  const [consents, setConsents] = useState({
    personal: false,
    location: false,
    fcm: false,
    guardian: false, // 어린이용 추가 항목
  });

  const toggle = (key: keyof typeof consents) =>
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));

  const isParent = userType === "parent";
  const requiredKeys = isParent
    ? ["personal", "location", "fcm"]
    : ["personal", "location", "fcm", "guardian"];

  const allAgreed = requiredKeys.every((k) => consents[k as keyof typeof consents]);
  const setAll = (value: boolean) => {
    const newState: any = {};
    requiredKeys.forEach((key) => (newState[key] = value));
    setConsents(newState);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단: 돌아가기 + NAVI 로고 */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.logoText}>NAVI</Text>
        </View>

        {/* 개인정보 수집 및 이용 */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>[필수] 개인정보 수집 및 이용 동의</Text>
          <Text style={styles.boxDesc}>
            {isParent
              ? "보호자 이름, 연락처, 이메일, 아동 이름, 생년월일 등은 아동 회원가입 및 보호자-자녀 매칭, 법정대리인 확인을 위해 수집됩니다."
              : "이름, 연락처, 이메일 등은 서비스 제공을 위해 수집됩니다."}
            {"\n"}(보유기간: 회원 탈퇴 시까지, 관련 법령에 따라 최대 3년 보관)
          </Text>
          <TouchableOpacity
            style={[styles.check, consents.personal && styles.checkOn]}
            onPress={() => toggle("personal")}
          >
            <Text style={styles.checkText}>
              {consents.personal ? "☑" : "☐"} 위 내용에 동의합니다
            </Text>
          </TouchableOpacity>
        </View>

        {/* 위치 정보 수집 */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>[필수] 위치 정보 수집 및 이용 동의</Text>
          <Text style={styles.boxDesc}>
            {isParent
              ? "아동의 위치를 기반으로 안전경로 추천 기능 제공을 위해 위치 정보를 수집합니다."
              : "안전한 이동 경로 안내를 위해 위치 정보를 수집합니다."}
            {"\n"}(보유기간: 회원 탈퇴 시까지, 관련 법령에 따라 최대 3년 보관)
          </Text>
          <TouchableOpacity
            style={[styles.check, consents.location && styles.checkOn]}
            onPress={() => toggle("location")}
          >
            <Text style={styles.checkText}>
              {consents.location ? "☑" : "☐"} 위 내용에 동의합니다
            </Text>
          </TouchableOpacity>
        </View>

        {/* 푸시 토큰 수집 */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>[필수] 푸시 토큰(FCM) 수집 및 이용 동의</Text>
          <Text style={styles.boxDesc}>
            {isParent
              ? "보호자-자녀 간 알림 및 푸시 메시지 수신을 위해 디바이스 푸시 토큰을 수집합니다."
              : "서비스 알림 제공을 위해 디바이스 푸시 토큰을 수집합니다."}
            {"\n"}(보유기간: 회원 탈퇴 시까지, 관련 법령에 따라 최대 3년 보관)
          </Text>
          <TouchableOpacity
            style={[styles.check, consents.fcm && styles.checkOn]}
            onPress={() => toggle("fcm")}
          >
            <Text style={styles.checkText}>
              {consents.fcm ? "☑" : "☐"} 위 내용에 동의합니다
            </Text>
          </TouchableOpacity>
        </View>

        {/* 어린이 전용: 법정대리인 동의 */}
        {!isParent && (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>[필수] 법정대리인 동의</Text>
            <Text style={styles.boxDesc}>
              만 14세 미만 사용자는 회원가입 시 반드시 법정대리인의 동의가 필요합니다.
              보호자 정보(이름, 연락처)를 입력하여 동의 절차를 진행합니다.
            </Text>
            <TouchableOpacity
              style={[styles.check, consents.guardian && styles.checkOn]}
              onPress={() => toggle("guardian")}
            >
              <Text style={styles.checkText}>
                {consents.guardian ? "☑" : "☐"} 법정대리인 동의에 동의합니다
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 전체 동의 / 다음 버튼 */}
        <TouchableOpacity
          style={[
            styles.allAgreeBtn,
            allAgreed && { backgroundColor: "#DDD" },
          ]}
          onPress={() => setAll(true)}
          disabled={allAgreed}
        >
          <Text style={styles.allAgreeText}>
            {allAgreed ? "✔ 모든 항목에 동의 완료" : "전체 항목 모두 동의하기"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, !allAgreed && { opacity: 0.4 }]}
          disabled={!allAgreed}
          onPress={() => navigation.navigate("SignupForm", { userType })}
        >
          <Text style={styles.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 22, paddingVertical: 40 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 40,
  },

  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFDE59",
    letterSpacing: 2,
  },

  box: {
    borderWidth: 1,
    borderColor: "#E6E8EA",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FAFAFA",
    marginBottom: 18,
  },
  boxTitle: { fontSize: 15, fontWeight: "700", color: "#000", marginBottom: 8 },
  boxDesc: { fontSize: 13, color: "#555", lineHeight: 19 },
  check: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E6E8EA",
  },
  checkOn: { backgroundColor: "#FFF8D6", borderColor: "#FFDE59" },
  checkText: { fontSize: 13, color: "#333" },

  allAgreeBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFDE59",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  allAgreeText: { fontSize: 16, fontWeight: "700", color: "#000" },

  nextBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFDE59",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  nextBtnText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
