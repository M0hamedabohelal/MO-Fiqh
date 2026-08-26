import { motion, AnimatePresence } from 'framer-motion';
import { FiWifiOff, FiRefreshCw, FiCheckCircle, FiX } from 'react-icons/fi';

/**
 * لافتات حالة التطبيق المثبت (PWA):
 * - بانر "أنت غير متصل" أعلى الشاشة
 * - إشعار "تحديث جديد جاهز" أسفل الشاشة
 * - إشعار "التطبيق جاهز للعمل أوفلاين" (يظهر مرة واحدة بعد أول زيارة)
 */
const PWABanners = ({
  isOffline,
  needRefresh,
  applyUpdate,
  offlineReady,
  dismissOfflineReady,
}) => (
  <>
    {/* بانر فقدان الاتصال */}
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="position-fixed top-0 start-0 end-0 d-flex align-items-center justify-content-center gap-2 py-2 px-3"
          style={{
            zIndex: 3000,
            backgroundColor: '#856404',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 'bold',
          }}
        >
          <FiWifiOff size={16} />
          أنت غير متصل بالإنترنت — المحتوى المحمّل متاح للقراءة
        </motion.div>
      )}
    </AnimatePresence>

    {/* إشعار التحديث الجاهز */}
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="position-fixed bottom-0 start-0 end-0 d-flex align-items-center justify-content-center gap-3 py-2 px-3 mb-5 mb-md-0"
          style={{ zIndex: 3000 }}
        >
          <div
            className="d-flex align-items-center gap-3 px-3 py-2 shadow"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'var(--accent-color)',
              borderRadius: '12px',
            }}
          >
            <span className="fw-bold small">تحديث جديد جاهز</span>
            <button
              className="btn btn-sm d-flex align-items-center gap-1 fw-bold"
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', borderRadius: '8px' }}
              onClick={applyUpdate}
            >
              <FiRefreshCw size={14} /> تحديث الآن
            </button>
          </div>
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
          style={{ zIndex: 3000 }}
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
