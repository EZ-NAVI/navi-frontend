import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
}

export default function RouteRatingModal({ visible, onClose, onSubmit }: Props) {
  const [rating, setRating] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>

        {/* 📌 캐릭터는 뒤쪽에 배치 */}
        <Image
          source={require("../assets/character.png")}
          style={styles.character}
          resizeMode="contain"
        />

        {/* 📌 모달 박스 */}
        <View style={styles.modalBox}>

          {/* 상단 멘트 */}
          <Text style={styles.title}>길안내는 어떠셨나요?</Text>

          {/* ⭐ 별 평가 (상단으로 올림) */}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Icon
                  name={n <= rating ? "star" : "star-outline"}
                  size={34}
                  color="#FFD700"
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* 제출 버튼 */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => {
              onSubmit(rating);
              onClose();
            }}
          >
            <Text style={styles.submitText}>확인</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  /* 📌 캐릭터: 모달 뒤로 배치 */
  character: {
    width: 180,
    height: 180,
    position: "absolute",
    top: 200,
    zIndex: -1,
  },

  /* 📌 하얀 모달 박스 */
  modalBox: {
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 40,     // 🔥 멘트 + 별점을 위쪽으로 올림
    paddingBottom: 20,
    alignItems: "center",
    position: "relative",
  },

  /* 📌 상단 멘트 */
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,   // 🔥 간격 살짝 줄임 → 상단 배치 감 강조
  },

  /* ⭐ 별점 영역 */
  starRow: {
    flexDirection: "row",
    marginBottom: 20,  // 🔥 아래 버튼과 여백 확보
  },

  /* 제출 버튼 */
  submitBtn: {
    backgroundColor: "#F4C400",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 12,
  },

  submitText: {
    fontSize: 16,
    fontWeight: "700", // 🔥 Bold로 변경 완료
    color: "#333",
  },
});
