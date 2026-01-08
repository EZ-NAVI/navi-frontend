import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { deleteReport } from '../api/reports';
import { useAppAlertStore } from '../stores/appAlertStore';

interface ReportEditModalProps {
  visible: boolean;
  reportData: any | null;
  onClose: () => void;
  onEdit: () => void;
}

/**
 * 반려된 제보 수정 모달
 * - 부모가 제보를 반려했을 때 자녀에게 표시
 * - "삭제" 또는 "수정하기" 선택 가능
 */
export default function ReportEditModal({
  visible,
  reportData,
  onClose,
  onEdit,
}: ReportEditModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!reportData) return null;

  const notify = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  const handleDelete = async () => {
    const reportId = reportData.reportId || reportData.report_id || reportData.id;
    
    if (!reportId) {
      notify('제보 ID를 찾을 수 없습니다.');
      return;
    }

    useAppAlertStore.getState().show({
      title: '제보 삭제',
      body: '정말로 이 제보를 삭제하시겠습니까?',
      ctaText: '확인',
      cancelText: '취소',
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          console.log(`🗑️ [DELETE] 제보 삭제 시작: reportId=${reportId}`);
          await deleteReport(reportId);
          console.log('✅ [DELETE] 제보 삭제 완료');
          notify('제보가 삭제되었습니다.');
          onClose();
        } catch (error: any) {
          console.error('❌ [DELETE] 제보 삭제 실패:', error);
          notify(error?.response?.data?.message || '제보 삭제에 실패했습니다.');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <MaterialIcons
              name="edit"
              size={40}
              color="#FF6B6B"
              accessible={true}
              accessibilityRole="image"
              accessibilityLabel="수정 아이콘"
            />
            <Text
              style={styles.title}
              accessible={true}
              accessibilityLabel="알림, 수정 요청"
            >
              수정 요청
            </Text>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.message}>
              부모님이 제보 수정을 요청했어요.{'\n'}
              제보를 다시 확인하고 수정해주세요.
            </Text>

            {reportData.category && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>카테고리:</Text>
                <Text style={styles.value}>{reportData.category}</Text>
              </View>
            )}

            {reportData.description && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>내용:</Text>
                <Text style={styles.value}>{reportData.description}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.cancelButton, isDeleting && styles.buttonDisabled]} 
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>
                {isDeleting ? '삭제 중...' : '삭제'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.editButton, isDeleting && styles.buttonDisabled]} 
              onPress={onEdit}
              disabled={isDeleting}
            >
              <Text style={styles.editButtonText}>수정하기</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
