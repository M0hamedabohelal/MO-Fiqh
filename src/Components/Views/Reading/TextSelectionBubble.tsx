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
          initial={{ opacity: 0, scale: 0.85, y: selectionPopup.below ? -6 : 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed',
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: isSmallScreen ? '#ffffff' : 'var(--badge-bg)',
            border: isSmallScreen ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
            color: isSmallScreen ? '#1a1a1a' : 'var(--text-main)',
            padding: '6px 8px',
            borderRadius: '50px',
            boxShadow: '0 6px 20px rgba(201, 168, 76, 0.55), 0 2px 8px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 16px)',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-ui)',
            userSelect: 'none',
          }}
        >
          <button
            onClick={onSaveHighlight}
            title="حفظ النص المحدد كفائدة"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: 'none', color: 'inherit',
              fontWeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit',
              padding: '6px 12px', borderRadius: '50px', cursor: 'pointer',
            }}
          >
            <FiEdit3 size={16} /> حفظ كفائدة
          </button>
          <span style={{ width: '1px', height: '20px', background: 'rgba(26,26,26,0.25)' }} />
          <button
            onClick={onOpenQuoteImage}
            title="تحويل النص المحدد إلى بطاقة مصوّرة"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: 'none', color: 'inherit',
              fontWeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit',
              padding: '6px 12px', borderRadius: '50px', cursor: 'pointer',
            }}
          >
            <FiImage size={16} /> صورة
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
