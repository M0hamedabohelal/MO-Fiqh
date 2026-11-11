import { useContext } from 'react';
import { ConfirmContext } from './confirmContext';
import type { ConfirmApi } from './confirmContext';

// منفصل عن ConfirmProvider.tsx لأن قاعدة react-refresh/only-export-components
// تمنع تصدير مكوّن + هوك من الملف نفسه (كسر HMR عند التعديل).

export type { ConfirmOptions } from './confirmContext';

const FALLBACK: ConfirmApi = { confirm: async () => false };

/**
 * داخل ConfirmProvider: يفتح حوار التأكيد.
 * خارجه (مكوّن معزول في اختبار): يرفض بصمت بدل تجميد الاختبار.
 */
export function useConfirm(): ConfirmApi['confirm'] {
  const ctx = useContext(ConfirmContext);
  return (ctx ?? FALLBACK).confirm;
}
