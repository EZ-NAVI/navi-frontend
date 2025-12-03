import { create } from 'zustand';

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

interface ReportApprovalModalState {
  isVisible: boolean;
  reportData: ReportData | null;
  showModal: (data: ReportData) => void;
  hideModal: () => void;
}

export const useReportApprovalModal = create<ReportApprovalModalState>((set) => ({
  isVisible: false,
  reportData: null,
  showModal: (data: ReportData) => set({ isVisible: true, reportData: data }),
  hideModal: () => set({ isVisible: false, reportData: null }),
}));
