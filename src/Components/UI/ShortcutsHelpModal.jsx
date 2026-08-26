import { motion, AnimatePresence } from 'framer-motion';

// نافذة دليل اختصارات الإنتاجية
const ShortcutsHelpModal = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1200, padding: '20px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="custom-card p-4 w-100"
          style={{ maxWidth: '560px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>اختصارات الإنتاجية</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>إغلاق</button>
          </div>
          <div className="d-grid gap-2">
            <div><strong>/</strong> أو <strong>Ctrl+K</strong> = فتح البحث</div>
            <div><strong>Arrow Left / Arrow Right</strong> = التالي / السابق أثناء القراءة</div>
            <div><strong>B</strong> = حفظ/إلغاء المفضلة للمسألة الحالية</div>
            <div><strong>M</strong> = صفحة المفضلة</div>
            <div><strong>H</strong> = صفحة الفوائد المقتبسة</div>
            <div><strong>L</strong> = فهرس المسائل</div>
            <div><strong>S</strong> = فتح البحث أثناء القراءة</div>
            <div><strong>F</strong> = حفظ التحديد الحالي كفائدة (بعد تحديد النص)</div>
            <div><strong>?</strong> = إظهار/إخفاء هذا الدليل</div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ShortcutsHelpModal;
