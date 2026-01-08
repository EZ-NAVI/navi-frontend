import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ReportData {
  id?: string;
  reportId?: string;
  report_id?: string;
  category?: string;
  description?: string;
  image_url?: string;
  imageUrl?: string;
  location_lat?: number;
  location_lng?: number;
  [key: string]: any;
}

interface Props {
  visible: boolean;
  reportData: ReportData | null;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function ReportApprovalModal({
  visible,
  reportData,
  onApprove,
  onReject,
  onClose,
}: Props) {
  if (!reportData) return null;

  const reportId = reportData.id || reportData.reportId || reportData.report_id;
  const category = reportData.category || '카테고리 없음';
  const description = reportData.description || '내용 없음';
  const imageUrl = reportData.image_url || reportData.imageUrl;
  const eventType = reportData.eventType || reportData.event_type;
  const isUpdated = eventType === 'report.updated'; // 수정된 제보인지 확인

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isUpdated ? '알림: 수정된 제보' : '알림: 새로운 제보'}
              </Text>
              {isUpdated && (
                <View style={styles.updatedBadge}>
                  <Text style={styles.updatedBadgeText}>수정됨</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="나가기"
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 카테고리 */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>카테고리: {category}</Text>
            </View>

            {/* 사진 */}
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
                accessible={true}
                accessibilityRole="image"
                accessibilityLabel="자녀 제보"
              />
            ) : (
              <View style={styles.noImage}>
                <MaterialIcons name="image-not-supported" size={48} color="#ccc" />
                <Text style={styles.noImageText}>사진 없음</Text>
              </View>
            )}

            {/* 제보 내용 */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>제보 내용</Text>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>

            {/* 위치 정보 (있으면 표시) */}
            {reportData.location_lat && reportData.location_lng && (
              <View style={styles.locationContainer}>
                <MaterialIcons name="location-on" size={16} color="#666" />
                <Text style={styles.locationText}>
                  위도: {reportData.location_lat.toFixed(6)}, 경도: {reportData.location_lng.toFixed(6)}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 버튼 영역 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="반려"
            >
              <Text style={styles.buttonText}>반려</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.approveButton]}
              onPress={onApprove}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="승인"
            >
              <Text style={styles.buttonText}>승인</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  updatedBadge: {
    backgroundColor: '#FFD44C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  updatedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD44C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  noImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
      backgroundColor: '#eee',
  },
  approveButton: {
    backgroundColor: '#FFDE59',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
