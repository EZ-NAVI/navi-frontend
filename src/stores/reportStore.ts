import { create } from 'zustand';

// 제보 데이터 타입
export interface Report {
  reportId?: string;
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  content?: string;
  locationLat?: number;
  locationLng?: number;
  location_lat?: number;
  location_lng?: number;
  imageUrl?: string;
  image_url?: string;
  photoUrl?: string;
  photo_url?: string;
  status?: 'APPROVED' | 'REJECTED' | 'PENDING';
  userEvaluation?: 'good' | 'normal' | 'bad';
  badCount?: number;
  normalCount?: number;
  goodCount?: number;
  totalFeedbacks?: number;
  comments?: any[];
  createdAt?: string;
  created_at?: string;
  [key: string]: any; // 기타 필드
}

interface ReportState {
  reports: Report[];
  addOrUpdate: (report: Report) => void;
  remove: (reportId: string) => void;
  updateStatus: (reportId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => void;
  setReports: (reports: Report[]) => void;
  clearReports: () => void;
}

/**
 * 제보 리스트를 관리하는 전역 상태 스토어
 * WebSocket 이벤트로 실시간 갱신에 사용
 */
export const useReportStore = create<ReportState>((set) => ({
  reports: [],

  /**
   * 제보를 추가하거나 업데이트
   * - 이미 존재하면 업데이트, 없으면 추가
   */
  addOrUpdate: (report: Report) => {
    set((state) => {
      const reportId = String(report.reportId ?? report.id ?? '');
      if (!reportId) {
        console.warn('[reportStore] reportId가 없어서 추가/업데이트 실패:', report);
        return state;
      }

      const existingIndex = state.reports.findIndex(
        (r) => String(r.reportId ?? r.id ?? '') === reportId
      );

      let newReports: Report[];
      if (existingIndex >= 0) {
        // 업데이트
        newReports = [...state.reports];
        newReports[existingIndex] = { ...newReports[existingIndex], ...report };
        console.log(`[reportStore] 제보 업데이트: reportId=${reportId}`);
      } else {
        // 추가
        newReports = [report, ...state.reports];
        console.log(`[reportStore] 제보 추가: reportId=${reportId}`);
      }

      return { reports: newReports };
    });
  },

  /**
   * 제보를 리스트에서 제거
   */
  remove: (reportId: string) => {
    set((state) => {
      const newReports = state.reports.filter(
        (r) => String(r.reportId ?? r.id ?? '') !== reportId
      );
      console.log(`[reportStore] 제보 제거: reportId=${reportId}`);
      return { reports: newReports };
    });
  },

  /**
   * 제보의 승인/거부 상태 업데이트
   */
  updateStatus: (reportId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    set((state) => {
      const newReports = state.reports.map((r) => {
        const rid = String(r.reportId ?? r.id ?? '');
        if (rid === reportId) {
          console.log(`[reportStore] 제보 상태 업데이트: reportId=${reportId}, status=${status}`);
          return { ...r, status };
        }
        return r;
      });
      return { reports: newReports };
    });
  },

  /**
   * 제보 리스트 전체를 설정 (초기 로드 시)
   */
  setReports: (reports: Report[]) => {
    set({ reports });
    console.log(`[reportStore] 제보 리스트 설정: ${reports.length}개`);
  },

  /**
   * 제보 리스트 초기화
   */
  clearReports: () => {
    set({ reports: [] });
    console.log('[reportStore] 제보 리스트 초기화');
  },
}));
