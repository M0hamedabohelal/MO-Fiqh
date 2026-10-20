import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/logo-circle.webp';

interface SplashScreenProps {
  visible: boolean;
  // نص الحالة المعروض أسفل المؤشر (يتغير حسب مرحلة الإقلاع/المزامنة)
  statusText?: string;
}

/**
 * شاشة الإقلاع والمزامنة — تبقى حتى تكتمل المصادقة ومزامنة المحتوى،
 * ثم تنزلق بعيدًا ليظهر الموقع. تتضمن حلقة دوّارة، وشريط تقدّم، ومؤشر نابض.
 */
const SplashScreen = ({ visible, statusText = 'جارٍ التحميل...' }: SplashScreenProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.06 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--z-splash)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 38%, #124040 0%, #0a2e2e 45%, #071d1d 100%)',
          gap: '22px',
          overflow: 'hidden',
        }}
      >
        {/* توهّج خلفي ناعم */}
        <motion.div
          aria-hidden
          animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.12, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(92,192,181,0.22) 0%, rgba(92,192,181,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* الشعار + حلقة المزامنة الدوّارة */}
        <div style={{ position: 'relative', width: '148px', height: '148px', display: 'grid', placeItems: 'center' }}>
          {/* حلقة دوّارة */}
          <motion.span
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, rgba(92,192,181,0) 0%, rgba(92,192,181,0) 55%, #5cc0b5 85%, #d8a06a 100%)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            }}
          />
          {/* هالة ناعمة ثابتة */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: '6px',
              borderRadius: '50%',
              border: '1px solid rgba(92,192,181,0.18)',
            }}
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            <motion.img
              src={logo}
              alt="الباحث الفقهي"
              width={108}
              height={108}
              decoding="async"
              fetchPriority="high"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '108px',
                height: '108px',
                borderRadius: '50%',
                boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
                objectFit: 'contain',
              }}
            />
          </motion.div>
        </div>

        {/* الاسم */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          <h1 style={{
            color: '#5cc0b5',
            fontSize: '1.6rem',
            fontWeight: 'bold',
            margin: 0,
            letterSpacing: '0.03em',
            fontFamily: 'inherit',
          }}>
            الباحث الفقهي
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.85rem',
            margin: '6px 0 0',
          }}>
            دراسة وتدبر
          </p>
        </motion.div>

        {/* شريط تقدّم لا نهائي (يمرّ ذهابًا وإيابًا) */}
        <div style={{
          position: 'relative',
          width: '180px',
          height: '4px',
          borderRadius: '999px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginTop: '4px',
        }}>
          <motion.span
            aria-hidden
            animate={{ x: ['-100%', '260%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '38%',
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, rgba(92,192,181,0) 0%, #5cc0b5 50%, rgba(92,192,181,0) 100%)',
            }}
          />
        </div>

        {/* نص الحالة */}
        <AnimatePresence mode="wait">
          <motion.p
            key={statusText}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            style={{
              color: 'rgba(255,255,255,0.62)',
              fontSize: '0.82rem',
              margin: 0,
              fontFamily: 'inherit',
            }}
          >
            {statusText}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SplashScreen;
