// src/components/SafetyNoticeModal.tsx
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function SafetyNoticeModal({ visible, onConfirm, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.dim}>
        <View style={s.card} accessibilityViewIsModal>
          <Text style={s.title}>잠시만요!</Text>
          <Text style={s.body}>
            주변을 먼저 확인하고 <Text style={{ color: '#d32f2f', fontWeight: '700' }}>위험 구역</Text>
            으로부터{'\n'}
            <Text style={{ color: '#d32f2f', fontWeight: '700' }}>멀리 떨어져서</Text> 촬영해주세요
          </Text>

          <View style={s.illust}>
            <MaterialIcons name="warning-amber" size={64} color="#f5a623" />
          </View>

          <TouchableOpacity style={s.cta} onPress={onConfirm} accessibilityLabel="확인했어요">
            <Text style={s.ctaText}>확인했어요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '86%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  title: { fontSize: 20, fontWeight: '800', alignSelf: 'flex-start', marginBottom: 6 },
  body: { fontSize: 16, lineHeight: 24, alignSelf: 'flex-start' },
  illust: {
    width: 160,
    height: 120,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff6e6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cta: {
    backgroundColor: '#FFD44C',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  ctaText: { fontWeight: '800', color: '#000' },
});
