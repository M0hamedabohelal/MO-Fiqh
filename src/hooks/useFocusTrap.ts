// حبس التركيز داخل الموودال + إغلاق بـ Escape — تحسين إتاحة وصول خفيف بدون اعتماديات
import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const prevFocused = document.activeElement as HTMLElement | null;
    // تركيز أول عنصر قابل للتركيز
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled'));

    const first = focusables()[0];
    (first ?? el).focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocused?.focus?.();
    };
  }, [containerRef, active, onEscape]);
}
