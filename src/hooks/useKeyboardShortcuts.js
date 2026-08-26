import { useEffect, useRef } from 'react';

/**
 * تسجيل مستمع لوحة المفاتيح على مستوى النافذة مع حفظ أحدث نسخة من المعالج
 * في مرجع — يمنع الإغلاقات القديمة (stale closures) دون إعادة ربط المستمع.
 */
export function useKeyboardShortcuts(handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const onKeyDown = (event) => handlerRef.current(event);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
