import React from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';

export default function CustomConfirm({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  hideCancel = false,
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title} accessibilityRole="alert">
            {title}
          </Text>
          <Text style={s.msg}>{message}</Text>

          <View style={[s.row, hideCancel ? s.rowCenter : null]}>
            {!hideCancel && (
              <TouchableOpacity
                style={[s.btn, s.cancel]}
                onPress={onCancel}
                accessibilityRole="button">
                <Text style={s.btnText}>취소</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.btn, s.confirm]}
              onPress={onConfirm}
              accessibilityRole="button">
              <Text style={s.btnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '78%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  title: {fontSize: 17, fontWeight: '700', marginBottom: 12, color: '#000'},
  msg: {color: '#333', lineHeight: 20, marginBottom: 18},
  row: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12},
  rowCenter: {justifyContent: 'center'},
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancel: {backgroundColor: '#ddd'},
  confirm: {backgroundColor: '#FFDE59'},
  btnText: {fontWeight: '700', color: '#000'},
});
