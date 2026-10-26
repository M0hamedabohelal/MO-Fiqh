import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/logo-circle-256.webp';

interface SplashScreenProps {
  visible: boolean;
  progress: number;
  // نص الحالة المعروض (يتغير حسب مرحلة الإقلاع/المزامنة ووجود الحساب)
  statusText?: string;
}

// حِكَم وآيات قصيرة تتناوب أثناء الانتظار — تمنح الشاشة حياة بدل الجمود
const WISDOM = [
  '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾',
  '﴿فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ﴾',
  'من سلك طريقًا يلتمس فيه علمًا سهّل الله له طريقًا إلى الجنة',
  'العلمُ نورٌ والجهلُ ظلام',
  'خيرُ العلمِ ما نفع',
  '﴿اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ﴾',
  'في طلبِ العلمِ عبادة',
];

function FloatingParticles() {
  // جسيمات ثابتة المواضع (تُحسب مرة واحدة) تتلألأ وتطفو بهدوء
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 2 + (i % 3),
        duration: 4 + (i % 5),
        delay: (i % 6) * 0.6,
        gold: i % 4 === 0,
      })),
    [],
  );
  return (
    <>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          aria-hidden
          animate={{ opacity: [0, 0.7, 0], y: [0, -18, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.gold ? '#d8a06a' : '#5cc0b5',
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

/**
 * شاشة الإقلاع والمزامنة — تبقى حتى تكتمل المصادقة ومزامنة المحتوى،
 * ثم تنزلق بعيدًا ليظهر الموقع. تتضمن حلقة دوّارة، وشريط تقدّم بنسبة،
 * وجسيمات متلألئة، وحِكَمًا تتناوب فلا تملّ العين.
 */
const SplashScreen = ({ visible, progress, statusText = 'جارٍ التحميل...' }: SplashScreenProps) => {
  const [wisdomIndex, setWisdomIndex] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    const id = setInterval(() => setWisdomIndex((i) => (i + 1) % WISDOM.length), 3400);
    return () => clearInterval(id);
  }, [visible]);

  const pct = Math.round(progress);

  return (
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
            gap: '18px',
            padding: 'calc(24px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px))',
            background: 'radial-gradient(circle at 50% 36%, #124040 0%, #0a2e2e 45%, #071d1d 100%)',
            overflow: 'hidden',
          }}
        >
          <FloatingParticles />

          {/* توهّج خلفي ناعم */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.14, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: '440px',
              height: '440px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(92,192,181,0.22) 0%, rgba(92,192,181,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* الشعار + حلقة المزامنة الدوّارة */}
          <div style={{ position: 'relative', width: '142px', height: '142px', display: 'grid', placeItems: 'center' }}>
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
            {/* حلقة خارجية معاكسة خفيفة */}
            <motion.span
              aria-hidden
              animate={{ rotate: -360 }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: '-10px',
                borderRadius: '50%',
                border: '1px dashed rgba(216,160,106,0.35)',
              }}
            />
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
                alt="يَسِّر"
                width={104}
                height={104}
                decoding="async"
                fetchPriority="high"
                animate={{ scale: [1, 1.045, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '104px',
                  height: '104px',
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
              fontSize: '1.55rem',
              fontWeight: 'bold',
              margin: 0,
              letterSpacing: '0.03em',
              fontFamily: 'inherit',
            }}>
              يَسِّر
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.42)',
              fontSize: '0.82rem',
              margin: '5px 0 0',
            }}>
              دراسة وتدبر
            </p>
          </motion.div>

          {/* شريط تقدّم + نسبة */}
          <div style={{ width: '224px', maxWidth: '78vw', marginTop: '6px' }}>
            <div style={{
              position: 'relative',
              height: '6px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255,255,255,0.09)',
              overflow: 'hidden',
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #2a9d8f 0%, #5cc0b5 60%, #d8a06a 120%)',
                  boxShadow: '0 0 12px rgba(92,192,181,0.5)',
                  transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'inherit',
            }}>
              <span>{statusText}</span>
              <span style={{ color: '#5cc0b5', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
          </div>

          {/* حكمة متناوبة */}
          <div style={{ minHeight: '38px', display: 'grid', placeItems: 'center', maxWidth: '320px', padding: '0 8px' }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={wisdomIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5 }}
                style={{
                  margin: 0,
                  textAlign: 'center',
                  color: 'rgba(216,160,106,0.85)',
                  fontSize: '0.86rem',
                  lineHeight: 1.7,
                  fontFamily: 'inherit',
                }}
              >
                {WISDOM[wisdomIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
