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
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          className="position-fixed bottom-0 start-0 end-0 d-flex justify-content-center py-3 mb-5 mb-md-3"
          style={{ zIndex: 3000, pointerEvents: 'none' }}
        >
          <button
            onClick={applyUpdate}
            className="d-flex align-items-center gap-2 px-4 py-2 shadow-lg border-0 fw-bold"
            style={{
              backgroundColor: '#4eb9a8',
              color: '#082525',
              borderRadius: '30px',
              pointerEvents: 'auto',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            <span>تحديث جديد جاهز</span>
            <FiRefreshCw size={16} />
            <span>تحديث الآن</span>
          </button>
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
