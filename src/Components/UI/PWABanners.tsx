import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiX } from 'react-icons/fi';

interface PWABannersProps {
  needRefresh: boolean;
  applyUpdate: () => void;
  offlineReady: boolean;
  dismissOfflineReady: () => void;
}

/**
 * لافتات حالة التطبيق المثبت (PWA):
 * - إشعار "تحديث جديد جاهز" أسفل الشاشة
 * - إشعار "التطبيق جاهز للعمل أوفلاين" (يظهر مرة واحدة بعد أول زيارة)
 * ملاحظة: مؤشر «غير متصل» انتقل إلى الشريط العلوي (أيقونة واي فاي مشطوبة).
 */
const PWABanners = ({
  needRefresh,
  applyUpdate,
  offlineReady,
  dismissOfflineReady,
}: PWABannersProps) => (
  <>
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="position-fixed bottom-0 start-0 end-0 d-flex justify-content-center py-3 mb-5 mb-md-3"
          style={{ zIndex: 'var(--z-banner)', pointerEvents: 'none', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          role="status"
          aria-live="polite"
        >
          <motion.button
            onClick={applyUpdate}
            className="d-flex align-items-center gap-2 px-4 py-3 border-0 fw-bold"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, #4eb9a8 0%, #2a9d8f 100%)',
              color: '#fff',
              borderRadius: '50px',
              pointerEvents: 'auto',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(46,180,163,0.45)',
              letterSpacing: '0.02em',
            }}
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </motion.span>
            <span>تحديث الموقع</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>

    {/* إشعار جاهزية العمل أوفلاين */}
    <AnimatePresence>
      {offlineReady && !needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="position-fixed bottom-0 start-0 end-0 d-flex justify-content-center py-2 px-3 mb-5 mb-md-0"
          style={{ zIndex: 'var(--z-banner)', paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          role="status"
          aria-live="polite"
        >
          <div
            className="d-flex align-items-center gap-2 px-3 py-2 shadow small"
            style={{
              backgroundColor: 'var(--badge-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
            }}
          >
            <FiCheckCircle size={16} style={{ color: '#27ae60' }} />
            تم تجهيز التطبيق للعمل بدون إنترنت
            <button
              className="btn btn-sm p-1 d-flex align-items-center"
              onClick={dismissOfflineReady}
              title="إخفاء"
              aria-label="إخفاء التنبيه"
            >
              <FiX size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);

export default PWABanners;
