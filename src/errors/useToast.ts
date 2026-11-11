import { useContext } from 'react';
import { ToastContext } from './toastContext';
import type { ToastApi } from './toastContext';

// منفصل عن ToastProvider.tsx لأن قاعدة react-refresh/only-export-components
// تمنع تصدير مكوّن + هوك من الملف نفسه.

export type { ToastApi, ToastTone } from './toastContext';

/** مُهيّأ صامت: يعمل خارج المزوّد بلا رمي (اختبارات المكوّنات المعزولة) */
const FALLBACK: ToastApi = {
  show: (m, tone) => { console.info(`[toast:${tone ?? 'info'}]`, m); return 0; },
  success: (m) => { console.info('[toast:success]', m); return 0; },
  info: (m) => { console.info('[toast:info]', m); return 0; },
  warning: (m) => { console.info('[toast:warning]', m); return 0; },
  error: (m) => { console.info('[toast:error]', m); return 0; },
  dismiss: () => {},
};

/** هوك الوصول للإشعارات — استعمله داخل ToastProvider */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return ctx ?? FALLBACK;
}
