import React from 'react';
import SafetyNoticeModal from './SafetyNoticeModal';
import { useAppAlertStore } from '../stores/appAlertStore';

export default function AppAlertModal() {
  const { isVisible, title, body, ctaText, cancelText, onConfirm, onCancel, hide } = useAppAlertStore();

  const handleConfirm = () => {
    try {
      if (onConfirm) onConfirm();
    } catch (e) {
      console.warn('AppAlertModal onConfirm error', e);
    }
    hide();
  };

  const handleCancel = () => {
    try {
      if (onCancel) onCancel();
    } catch (e) {
      console.warn('AppAlertModal onCancel error', e);
    }
    hide();
  };

  return (
    <SafetyNoticeModal
      visible={isVisible}
      onClose={hide}
      onConfirm={handleConfirm}
      onCancel={onCancel ? handleCancel : undefined}
      title={title ?? undefined}
      body={body ?? undefined}
      ctaText={ctaText ?? undefined}
      cancelText={cancelText ?? undefined}
    />
  );
}
