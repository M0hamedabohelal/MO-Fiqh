import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { ToastContext } from './toastContext';
import type { ToastApi, ToastTone } from './toastContext';
import './toast.css';

// ─── نظام الإشعارات (Toast) ───
// بديل alert() المحجوب والمستقل عن الثيم. الفكرة:
// - مصدر واحد للرسائل القصيرة: «تم النسخ»، «فشل الحفظ»، «تعذّر توليد الشهادة».
// - لا يتجاوز 3 رسائل، ولا يعيد نفس النص مرتين متتاليتين بلا داعٍ.
// - يظهر فوق شريط التنقل السفلي على الجوال (bottom + safe-area).

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}
const MAX_VISIBLE = 3;
const DEFAULT_MS = 4000;
const ERROR_MS = 6000;

const ICONS: Record<ToastTone, IconType> = {
  success: FiCheckCircle,
  info: FiInfo,
  warning: FiAlertTriangle,
  error: FiAlertCircle,
};

const prefersReducedMotion = (): boolean => {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastMessage = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = 'info', durationMs?: number) => {
    const now = Date.now();
    // منع تكرار نفس النص خلال ثانيتين (نقرتان متتاليتان على «نسخ»)
    if (lastMessage.current.text === message && now - lastMessage.current.at < 2000) return lastMessage.current.at;
    lastMessage.current = { text: message, at: now };

    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev, { id, tone, message }].slice(-MAX_VISIBLE));

    const ms = durationMs ?? (tone === 'error' ? ERROR_MS : DEFAULT_MS);
    const timer = setTimeout(() => dismiss(id), ms);
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  // تنظيف كل المؤقتات عند إلغاء التثبيت
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    dismiss,
    success: (m, d) => show(m, 'success', d),
    info: (m, d) => show(m, 'info', d),
    warning: (m, d) => show(m, 'warning', d),
    error: (m, d) => show(m, 'error', d),
  }), [show, dismiss]);

  const reduced = prefersReducedMotion();

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="toast-viewport" aria-live="polite" aria-relevant="additions text">
          {items.map((item) => {
            const Icon = ICONS[item.tone];
            return (
              <div
                key={item.id}
                className="toast-item"
                data-tone={item.tone}
                data-reduced-motion={reduced ? 'true' : 'false'}
                role={item.tone === 'error' ? 'alert' : 'status'}
              >
                <Icon size={18} className="toast-icon" aria-hidden="true" />
                <span className="toast-text">{item.message}</span>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => dismiss(item.id)}
                  aria-label="إغلاق الإشعار"
                >
                  <FiX size={15} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};

/* السياق يُصدَّر من toastContext.ts — قاعدة fast-refresh تمنع تصدير context بجوار مكوّن */
