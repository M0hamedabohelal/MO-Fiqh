import { createContext } from 'react';
import type { ReactNode } from 'react';

// سياق حوار التأكيد في ملف مستقل (قاعدة react-refresh/only-export-components).

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** تأكيد خطر: الزر الرئيسي بلون danger */
  danger?: boolean;
}

export interface ConfirmApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmApi | null>(null);
