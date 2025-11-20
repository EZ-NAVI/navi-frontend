import { create } from 'zustand';

interface ReportEditModalState {
  isVisible: boolean;
  reportData: any | null;
  showModal: (data: any) => void;
  hideModal: () => void;
}

export const useReportEditModal = create<ReportEditModalState>((set) => ({
  isVisible: false,
  reportData: null,
  showModal: (data: any) => {
    console.log('📝 [ReportEditModal] 수정 모달 표시:', data);
    set({ isVisible: true, reportData: data });
  },
  hideModal: () => {
    console.log('📝 [ReportEditModal] 수정 모달 닫기');
    set({ isVisible: false, reportData: null });
  },
}));
