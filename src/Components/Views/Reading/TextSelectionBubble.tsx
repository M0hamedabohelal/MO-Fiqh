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
  return (
    <AnimatePresence>
      {selectionPopup.show && (
        <motion.div
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
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
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
            gap: '4px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 16px)',
            fontSize: isSmallScreen ? '0.85rem' : '0.9rem',
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
              padding: isSmallScreen ? '8px 12px' : '6px 14px',
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
              padding: isSmallScreen ? '8px 12px' : '6px 14px',
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
