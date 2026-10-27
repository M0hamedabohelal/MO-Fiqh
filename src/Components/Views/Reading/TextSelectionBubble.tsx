import { useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit3, FiImage } from 'react-icons/fi';

export interface SelectionPopupState {
  show: boolean;
  text: string;
  x: number;
  y: number;
  below: boolean;
}

interface TextSelectionBubbleProps {
  selectionPopup: SelectionPopupState;
  isSmallScreen: boolean;
  onSaveHighlight: () => void;
  onOpenQuoteImage: () => void;
}

export const TextSelectionBubble = ({
  selectionPopup,
  isSmallScreen,
  onSaveHighlight,
  onOpenQuoteImage,
}: TextSelectionBubbleProps) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // فحص وتصحيح موضع البوب-أب فوراً قبل الرسم لضمان عدم خروجه من حدود الشاشة إطلاقاً
  useLayoutEffect(() => {
    if (!selectionPopup.show || !bubbleRef.current) {
      setOffset({ dx: 0, dy: 0 });
      return;
    }

    const el = bubbleRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const screenW = document.documentElement.clientWidth || window.innerWidth;
    const screenH = window.innerHeight;

    const marginX = 12;
    const marginTop = 50;
    // حجز مساحة لشريط التنقل السفلي في الهواتف لمنع تداخله مع البوب-أب
    const marginBottom = isSmallScreen ? 82 : 24;

    let dx = 0;
    let dy = 0;

    // حماية الحافة اليمنى: منع خروج البوب-أب خارج الشاشة يميناً
    if (rect.right > screenW - marginX) {
      dx -= (rect.right - (screenW - marginX));
    }
    // حماية الحافة اليسرى: منع خروج البوب-أب خارج الشاشة يساراً
    if (rect.left + dx < marginX) {
      dx += (marginX - (rect.left + dx));
    }

    // حماية الحافة السفلية: منع خروج البوب-أب أسفل الشاشة أو فوق شريط التنقل
    const maxBottom = screenH - marginBottom;
    if (rect.bottom > maxBottom) {
      dy -= (rect.bottom - maxBottom);
    }
    // حماية الحافة العلوية: منع خروج البوب-أب أعلى الشاشة خلف الترويسة
    if (rect.top + dy < marginTop) {
      dy += (marginTop - (rect.top + dy));
    }

    if (dx !== 0 || dy !== 0) {
      setOffset({ dx, dy });
    } else {
      setOffset({ dx: 0, dy: 0 });
    }
  }, [selectionPopup.show, selectionPopup.x, selectionPopup.y, isSmallScreen]);

  return (
    <AnimatePresence>
      {selectionPopup.show && (
        <motion.div
          ref={bubbleRef}
          className="selection-popup"
          initial={{ opacity: 0, scale: 0.88, y: selectionPopup.below ? -8 : 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          onMouseDown={(e) => {
            // منع المتصفح من إلغاء تحديد النص عند الضغط على البوب-أب
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
          }}
          onTouchStart={(e) => {
            // منع زوال التحديد في الهواتف الذكية
            e.stopPropagation();
          }}
          style={{
            position: 'fixed',
            left: `${selectionPopup.x + offset.dx}px`,
            top: `${selectionPopup.y + offset.dy}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '2px solid var(--accent-color, #966816)',
            color: 'var(--text-main, #1a1a1a)',
            padding: isSmallScreen ? '4px 6px' : '6px 8px',
            borderRadius: '50px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 10px rgba(150, 104, 22, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: isSmallScreen ? '3px' : '4px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 20px)',
            width: 'max-content',
            boxSizing: 'border-box',
            fontSize: isSmallScreen ? '0.84rem' : '0.9rem',
            fontFamily: 'var(--font-ui)',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSaveHighlight();
            }}
            title="حفظ النص المحدد كفائدة"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontWeight: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              padding: isSmallScreen ? '7px 11px' : '6px 14px',
              borderRadius: '50px',
              cursor: 'pointer',
              minHeight: '38px',
            }}
          >
            <FiEdit3 size={17} style={{ color: 'var(--accent-color, #966816)' }} />
            <span>حفظ كفائدة</span>
          </button>

          <span
            style={{
              width: '1px',
              height: '20px',
              background: 'var(--border-color, rgba(0,0,0,0.2))',
              opacity: 0.7,
            }}
          />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenQuoteImage();
            }}
            title="تحويل النص المحدد إلى بطاقة مصوّرة"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontWeight: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              padding: isSmallScreen ? '7px 11px' : '6px 14px',
              borderRadius: '50px',
              cursor: 'pointer',
              minHeight: '38px',
            }}
          >
            <FiImage size={17} style={{ color: 'var(--primary-color, #0F3D3E)' }} />
            <span>صورة</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
