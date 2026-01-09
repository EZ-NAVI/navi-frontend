import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function CustomAlert({
  visible,
  title = "알림",
  message,
  onClose,
  hideCancel = false,
  onConfirm,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            {!hideCancel && (
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn]}
              onPress={onConfirm || onClose}
            >
              <Text style={styles.confirmText}>확인</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    marginTop: 26,
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  cancelBtn: {
    backgroundColor: "#eee",
  },
  confirmBtn: {
    backgroundColor: "#FFDE59",
  },
  cancelText: {
    textAlign: "center",
    color: "#555",
    fontWeight: "700",
  },
  confirmText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "700",
  },
});
