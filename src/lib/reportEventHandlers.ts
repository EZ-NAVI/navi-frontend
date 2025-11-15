// import { authStore } from '../stores/authStore'; // 나중에 구현 예정
import { useReportStore } from '../stores/reportStore';
import { useReportApprovalModal } from '../stores/reportApprovalModalStore';
import { useReportEditModal } from '../stores/reportEditModalStore';
import { Alert, Platform } from 'react-native';

// 이벤트 타입 정의
type EventType = 'report.created' | 'report.reviewed' | 'report.updated' | 'report.deleted';
type UserRole = 'CHILD' | 'PARENT';
type ReportStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

// WebSocket 이벤트 데이터 타입
interface WebSocketEventData {
  eventType?: EventType; // optional로 변경
  event_type?: string; // 서버가 snake_case로 보낼 수도 있음
  type?: string; // 또는 type으로 보낼 수도 있음
  reportId?: string;
  report_id?: string; // snake_case 버전
  id?: string; // 또는 id로만 올 수도
  status?: ReportStatus;
  [key: string]: any; // 기타 제보 데이터
}

/**
 * WebSocket으로부터 받은 report 관련 이벤트를 처리하는 메인 함수
 * @param data - WebSocket으로부터 받은 이벤트 데이터
 */
export function handleIncomingEvent(data: WebSocketEventData): void {
  try {
    console.log('\n========== 🔔 WebSocket 이벤트 수신 ==========');
    
    // eventType을 여러 형식에서 찾기
    let eventType = data.eventType || data.event_type || data.type;
    const reportId = data.reportId || data.report_id || data.id;
    
    // ⚠️ eventType이 없지만 status 필드가 있으면 report.reviewed로 처리
    if (!eventType && data.status) {
      eventType = 'report.reviewed';
      console.log('⚠️ eventType이 없지만 status 필드 발견 → report.reviewed로 처리');
    }
    
    console.log('📋 이벤트 타입:', eventType);
    console.log('🆔 제보 ID:', reportId);
    console.log('📦 전체 데이터:', JSON.stringify(data, null, 2));
    console.log('===========================================\n');

    // 이벤트 타입 검증
    if (!eventType) {
      console.warn('⚠️ eventType을 찾을 수 없습니다. 데이터:', data);
      // eventType이 없어도 데이터가 있으면 PARENT에게 모달 표시
      useReportApprovalModal.getState().showModal(data);
      return;
    }

    // 현재 유저의 role 가져오기 (기기 타입으로 자동 판별)
    // const role = authStore.getState().role as UserRole; // 나중에 구현
    // TODO: 실제 authStore 연결 후 아래 로직을 주석 처리
    
    // 임시: 실기기면 CHILD, 에뮬레이터면 PARENT (dev.ts와 동일하게)
    const isEmulator = (): boolean => {
      if (Platform.OS === 'android') {
        const { Brand, Model } = Platform.constants as any;
        return (
          Brand === 'google' || 
          Model?.toLowerCase().includes('sdk') || 
          Model?.toLowerCase().includes('emulator')
        );
      }
      return false;
    };
    
    // ✅ 실기기 = CHILD, 에뮬레이터 = PARENT
    const role = (!isEmulator() ? 'CHILD' : 'PARENT') as UserRole;

    console.log(`[WebSocket Event] 👤 role=${role} (${!isEmulator() ? '실기기' : '에뮬레이터'}), 🎯 eventType=${eventType}`);

    // eventType과 reportId를 데이터에 정규화
    const normalizedData: WebSocketEventData = {
      ...data,
      eventType: eventType as EventType,
      reportId,
    };

    // Role에 따라 처리 분기
    if (role === 'CHILD') {
      handleChildEvents(normalizedData);
    } else if (role === 'PARENT') {
      handleParentEvents(normalizedData);
    } else {
      console.warn('[WebSocket Event] 알 수 없는 role:', role);
    }
  } catch (error) {
    console.error('[WebSocket Event] 처리 중 에러:', error);
  }
}

/**
 * CHILD 계정의 이벤트 처리
 * - ②단계: "report.reviewed" 처리 (승인 시 알림, 반려 시 수정 모달)
 */
function handleChildEvents(data: WebSocketEventData): void {
  const { eventType, reportId, status } = data;

  switch (eventType) {
    case 'report.reviewed':
      if (!reportId || !status) {
        console.warn('[CHILD Event] reportId 또는 status가 없습니다:', data);
        return;
      }

      // reportStore.getState().updateStatus(reportId, status); // 나중에 구현
      useReportStore.getState().updateStatus(reportId, status);
      console.log(`✅ [CHILD Event] 제보 상태 업데이트: reportId=${reportId}, status=${status}`);

      // ②단계: 상태에 따라 처리
      if (status === 'APPROVED') {
        // ✅ 승인 시: Alert만 표시 (아무 액션 없음)
        Alert.alert(
          '✅ 승인됨',
          '부모님이 제보를 승인했어요!',
          [{ text: '확인', style: 'default' }]
        );
      } else if (status === 'REJECTED') {
        // ❌ 반려 시: 수정 모달 자동 표시
        console.log('❌ [CHILD Event] 반려됨 → 수정 모달 표시');
        useReportEditModal.getState().showModal({
          ...data,
          reportId,
          status,
        });
      }
      break;

    default:
      // CHILD는 다른 이벤트 무시
      console.log(`[CHILD Event] 무시됨: ${eventType}`);
      break;
  }
}

/**
 * PARENT 계정의 이벤트 처리
 * - ①단계: "report.created" 처리 (승인 모달 표시)
 * - ④단계: "report.updated" 처리 (수정된 제보 알림)
 * - "report.deleted" 처리 (삭제 알림)
 */
function handleParentEvents(data: WebSocketEventData): void {
  const { eventType, reportId } = data;

  switch (eventType) {
    case 'report.created':
      // ①단계: 자녀가 제보 생성 → 부모에게 승인 모달 표시
      useReportStore.getState().addOrUpdate(data);
      console.log('✅ [PARENT Event] 새로운 제보 추가됨');
      console.log('   제보 내용:', data);

      // 승인 모달 표시
      useReportApprovalModal.getState().showModal(data);
      break;

    case 'report.updated':
      // ④단계: 자녀가 수정 → 부모에게 승인 모달 다시 표시
      useReportStore.getState().addOrUpdate(data);
      console.log('✏️ [PARENT Event] 제보 수정됨');
      console.log('   수정된 제보 내용:', data);

      // 승인 모달 표시 (수정된 내용으로 다시 승인/반려 가능)
      useReportApprovalModal.getState().showModal(data);
      break;

    case 'report.deleted':
      if (!reportId) {
        console.warn('[PARENT Event] reportId가 없습니다:', data);
        return;
      }

      // 제보 리스트에서 제거
      useReportStore.getState().remove(reportId);
      console.log(`🗑️ [PARENT Event] 제보 삭제됨: reportId=${reportId}`);

      // Alert 알림 표시
      Alert.alert(
        '🗑️ 제보 삭제',
        '자녀가 제보를 삭제했어요.',
        [{ text: '확인', style: 'default' }]
      );
      break;

    default:
      // PARENT는 다른 이벤트 무시
      console.log(`[PARENT Event] 무시됨: ${eventType}`);
      break;
  }
}