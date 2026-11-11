import { createContext } from 'react';

// سياق الإشعارات في ملف مستقل: قاعدة react-refresh/only-export-components
// تمنع تصدير context بجوار مكوّن (يكسر HMR)، والفصل يجعل useToast نظيفًا أيضًا.

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastApi {
  show: (message: string, tone?: ToastTone, durationMs?: number) => number;
  success: (message: string, durationMs?: number) => number;
  info: (message: string, durationMs?: number) => number;
  warning: (message: string, durationMs?: number) => number;
  error: (message: string, durationMs?: number) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
