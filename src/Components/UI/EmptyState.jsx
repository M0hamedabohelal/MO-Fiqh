import { motion } from 'framer-motion';

/**
 * بطاقة الحالة الفارغة الموحدة — تصميم جذاب مع أنيميشن
 */
const EmptyState = ({ icon: Icon, title, message, children, hint }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="text-center py-5 px-4"
    style={{
      background: 'var(--card-bg)',
      borderRadius: '20px',
      border: '1px dashed var(--border-color)',
      maxWidth: '420px',
      margin: '40px auto',
    }}
  >
    {/* دائرة الأيقونة */}
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 180 }}
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--accent-color)22, var(--primary-color)11)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        border: '1.5px solid var(--border-color)',
      }}
    >
      {Icon && <Icon size={34} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />}
    </motion.div>

    {/* العنوان */}
    {title && (
      <motion.h5
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="fw-bold mb-2"
        style={{ color: 'var(--text-main)' }}
      >
        {title}
      </motion.h5>
    )}

    {/* الرسالة */}
    {message && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-muted mb-0"
        style={{ fontSize: '0.9rem', lineHeight: 1.7 }}
      >
        {message}
      </motion.p>
    )}

    {/* تلميح اختياري */}
    {hint && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-2 mb-0"
        style={{ fontSize: '0.78rem', color: 'var(--accent-color)', opacity: 0.75 }}
      >
        {hint}
      </motion.p>
    )}

    {/* أزرار أو محتوى إضافي */}
    {children && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-4"
      >
        {children}
      </motion.div>
    )}
  </motion.div>
);

export default EmptyState;
