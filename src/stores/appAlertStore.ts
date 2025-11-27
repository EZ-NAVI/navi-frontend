import { create } from 'zustand';

interface AppAlertState {
  isVisible: boolean;
  title: string | null;
  body: string | null;
  ctaText: string | null;
  onConfirm?: (() => void) | null;
  cancelText?: string | null;
  onCancel?: (() => void) | null;
  show: (opts: { title?: string; body?: string; ctaText?: string; cancelText?: string; onConfirm?: () => void; onCancel?: () => void }) => void;
  hide: () => void;
}

export const useAppAlertStore = create<AppAlertState>((set) => ({
  isVisible: false,
  title: null,
  body: null,
  ctaText: null,
  onConfirm: null,
  cancelText: null,
  onCancel: null,
  show: ({ title, body, ctaText, cancelText, onConfirm, onCancel }) => set({ isVisible: true, title: title ?? null, body: body ?? null, ctaText: ctaText ?? null, cancelText: cancelText ?? null, onConfirm: onConfirm ?? null, onCancel: onCancel ?? null }),
  hide: () => set({ isVisible: false, title: null, body: null, ctaText: null, cancelText: null, onConfirm: null, onCancel: null }),
}));
