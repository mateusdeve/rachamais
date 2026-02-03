import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
    duration?: number;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = (message: string, type: ToastType, duration = 3000) => {
    setToast({ message, type, visible: true, duration });
  };

  const showSuccess = (message: string) => {
    showToast(message, 'success');
  };

  const showError = (message: string) => {
    showToast(message, 'error', 4000);
  };

  const showInfo = (message: string) => {
    showToast(message, 'info');
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
        duration={toast.duration}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
