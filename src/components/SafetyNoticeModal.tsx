// src/components/SafetyNoticeModal.tsx
import React from 'react';
import {View, Text, Modal, TouchableOpacity, StyleSheet} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  title?: string;
  body?: React.ReactNode | string;
  ctaText?: string;
  cancelText?: string;
  onCancel?: () => void;
  hideCancel?: boolean;
}
export default function SafetyNoticeModal({
  visible,
  onConfirm,
  onClose,
  title,
  body,
  ctaText,
  cancelText,
  onCancel,
  hideCancel,
}: Props) {
  const renderBody = () => {
    if (body) {
      return typeof body === 'string' ? (
        <Text style={s.body}>{body}</Text>
      ) : (
        <View style={{alignSelf: 'stretch'}}>{body}</View>
      );
    }

    return (
      <Text style={s.body}>
        주변을 먼저 확인하고{' '}
        <Text style={{color: '#d32f2f', fontWeight: '700'}}>위험 구역</Text>
        으로부터{'\n'}
        <Text style={{color: '#d32f2f', fontWeight: '700'}}>
          멀리 떨어져서
        </Text>{' '}
        촬영해주세요
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={s.dim}>
        <View style={s.card} accessibilityViewIsModal>
          <Text
            style={s.title}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={title ?? '잠시만요!'}>
            {title ?? '잠시만요!'}
          </Text>
          <View
            accessible={true}
            accessibilityRole="text"
            style={{alignSelf: 'stretch'}}>
            {renderBody()}
          </View>

          <View
            style={s.illust}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel="경고">
            <MaterialIcons name="warning-amber" size={64} color="#f5a623" />
          </View>

          {hideCancel ? (
            <TouchableOpacity
              style={[s.cta, s.singleCta]}
              onPress={onConfirm}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="확인">
              <Text style={s.ctaText}>{ctaText ?? '확인'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.rowButtons}>
              <TouchableOpacity
                style={[s.cta, s.cancelBtn]}
                onPress={onCancel ?? onClose}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="취소">
                <Text style={s.cancelText}>{cancelText ?? '취소'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.cta, s.confirmBtn]}
                onPress={onConfirm}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="확인">
                <Text style={s.ctaText}>{ctaText ?? '확인'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    shadowOffset: {width: 0, height: 6},
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: 6,
    color: '#000',
  },
  body: {fontSize: 16, lineHeight: 24, alignSelf: 'flex-start', color: '#000'},
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
    flex: 1,
    minWidth: 140,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  singleCta: {
    width: '100%',
    flex: 0,
    alignSelf: 'stretch',
    marginTop: 12,
  },
  ctaText: {fontWeight: '800', color: '#000'},
  rowButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  cancelBtn: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd'},
  confirmBtn: {backgroundColor: '#FFD44C'},
  cancelText: {color: '#333', fontWeight: '700'},
});
