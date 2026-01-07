import { create } from 'zustand';

interface AppAlertState {
  isVisible: boolean;
  title: string | null;
  body: string | null;
  ctaText: string | null;
  onConfirm?: (() => void) | null;
  cancelText?: string | null;
  onCancel?: (() => void) | null;
  hideCancel?: boolean | null;
  show: (opts: { title?: string; body?: string; ctaText?: string; cancelText?: string; hideCancel?: boolean; onConfirm?: () => void; onCancel?: () => void }) => void;
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
  hideCancel: null,
  show: ({ title, body, ctaText, cancelText, hideCancel, onConfirm, onCancel }) => set({ isVisible: true, title: title ?? null, body: body ?? null, ctaText: ctaText ?? null, cancelText: cancelText ?? null, hideCancel: hideCancel ?? null, onConfirm: onConfirm ?? null, onCancel: onCancel ?? null }),
  hide: () => set({ isVisible: false, title: null, body: null, ctaText: null, cancelText: null, hideCancel: null, onConfirm: null, onCancel: null }),
}));
