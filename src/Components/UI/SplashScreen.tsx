import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/logo.webp';

interface SplashScreenProps {
  visible: boolean;
}

/**
 * شاشة التحميل الجميلة — تظهر حتى يكتمل تحميل التطبيق
 */
const SplashScreen = ({ visible }: SplashScreenProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0a2e2e 0%, #0d3b3b 50%, #082525 100%)',
          gap: '24px',
        }}
      >
        {/* الشعار */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <img
            src={logo}
            alt="الباحث الفقهي"
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              objectFit: 'contain',
            }}
          />
        </motion.div>

        {/* الاسم */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          <h1 style={{
            color: '#4eb9a8',
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

        {/* مؤشر التحميل */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
        >
          {[0, 1, 2].map((i: number) => (
            <motion.span
              key={i}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4eb9a8',
                display: 'inline-block',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SplashScreen;
