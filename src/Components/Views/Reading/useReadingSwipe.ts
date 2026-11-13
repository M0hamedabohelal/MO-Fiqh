import { useState, useRef, useEffect } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { triggerHaptic } from '../../../utils/haptics';

export interface UseReadingSwipeOptions {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export interface UseReadingSwipeReturn {
  dragOffset: number;
  isDragging: boolean;
  handleTouchStart: (e: ReactTouchEvent<HTMLDivElement>) => void;
  handleTouchMove: (e: ReactTouchEvent<HTMLDivElement>) => void;
  handleTouchEnd: (e: ReactTouchEvent<HTMLDivElement>) => void;
}

/**
 * useReadingSwipe — خطاف إدارة إيماءات السحب اللمسي الأفقي بين المسائل
 * يتضمن مقاومة فيزيائية مرنة، حماية التمرير الرأسي، منع السحب أثناء تحديد النص، ونبضات لمسية.
 */
export function useReadingSwipe({
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: UseReadingSwipeOptions): UseReadingSwipeReturn {
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasTriggeredThresholdHaptic = useRef<boolean>(false);
  const isVerticalScroll = useRef<boolean>(false);
  const touchRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (touchRafRef.current) cancelAnimationFrame(touchRafRef.current);
    };
  }, []);

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>): void => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    hasTriggeredThresholdHaptic.current = false;
    isVerticalScroll.current = false;
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>): void => {
    if (!touchStartRef.current || isVerticalScroll.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    // إذا كان التمرير عمودياً في المقام الأول، نتوقف فوراً ونترك المتصفح يمرر بسلاسة تامة
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      isVerticalScroll.current = true;
      if (isDragging) {
        if (touchRafRef.current) cancelAnimationFrame(touchRafRef.current);
        setIsDragging(false);
        setDragOffset(0);
      }
      return;
    }

    // إذا كان هناك نص محدد (أو جاري تحديده)، نمنع إيماءة السحب فوراً لحماية التحديد
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      return;
    }

    if (Math.abs(dx) > 12) {
      if (touchRafRef.current) cancelAnimationFrame(touchRafRef.current);
      touchRafRef.current = requestAnimationFrame(() => {
        setIsDragging(true);
        // معامل مقاومة مرنة يعطي شعوراً حقيقياً بالسحب
        const resistance = 0.38;
        const clamped = Math.max(-85, Math.min(85, dx * resistance));
        setDragOffset(clamped);
      });

      // نبضة لمسية اهتزازية خفيفة عند بلوغ عتبة التحويل (65px)
      const reached = Math.abs(dx) >= 65;
      if (reached && !hasTriggeredThresholdHaptic.current) {
        hasTriggeredThresholdHaptic.current = true;
        triggerHaptic('selection');
      } else if (!reached && hasTriggeredThresholdHaptic.current) {
        hasTriggeredThresholdHaptic.current = false;
      }
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>): void => {
    if (touchRafRef.current) {
      cancelAnimationFrame(touchRafRef.current);
      touchRafRef.current = null;
    }
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);

    if (isVerticalScroll.current) {
      isVerticalScroll.current = false;
      return;
    }

    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      return;
    }

    if (Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx > 0 && canGoPrev) {
        triggerHaptic('light');
        onPrev();
      } else if (dx < 0 && canGoNext) {
        triggerHaptic('light');
        onNext();
      }
    }
  };

  return {
    dragOffset,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
