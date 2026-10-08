// OnboardingSlides — شرائح تعريفية للمستخدم الجديد
// تظهر مرة واحدة فقط عند أول فتح للتطبيق بعد تسجيل الدخول
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const SLIDES = [
  {
    emoji: '📖',
    title: 'أهلاً بك في الباحث الفقهي',
    body: 'منصة متكاملة لدراسة الفقه الإسلامي — مسائل مرتبة، شروح الشيخ، وفيديوهات تعليمية كلها في مكان واحد.',
    color: 'var(--primary-color)',
  },
  {
    emoji: '🔖',
    title: 'احفظ مسائلك المفضلة',
    body: 'اضغط على أيقونة الحفظ لإضافة المسألة لمفضلتك. وظّف "الفوائد" لحفظ مقتطفات نصية مباشرة من المحتوى.',
    color: '#c9a84c',
  },
  {
    emoji: '⚡',
    title: 'تصفح بسرعة',
    body: 'استخدم البحث (Ctrl+K) للوصول لأي مسألة فوراً، أو استعن بالفهرس العائم أثناء القراءة للقفز بين المسائل.',
    color: '#27ae60',
  },
];

const STORAGE_KEY = 'fqh_onboarding_done';

interface OnboardingSlidesProps {
  onDone: () => void;
}

const OnboardingSlides = ({ onDone }: OnboardingSlidesProps) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) { finish(); return; }
    setDirection(1);
    setIndex(i => i + 1);
  };

  const prev = () => {
    setDirection(-1);
    setIndex(i => Math.max(0, i - 1));
  };

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onDone();
  };

  const slide = SLIDES[index];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '24px',
          maxWidth: '420px', width: '100%',
          padding: '2.5rem 2rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* خلفية ملونة خفيفة */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: `linear-gradient(90deg, ${slide.color}, var(--accent-color))`,
        }} />

        {/* زر الإغلاق */}
        <button
          onClick={finish}
          style={{
            position: 'absolute', top: '1rem', left: '1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px',
          }}
          title="تخطي"
        >
          <FiX size={20} />
        </button>

        {/* المحتوى المتحرك */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Emoji */}
            <div style={{
              fontSize: '4rem', textAlign: 'center', marginBottom: '1.25rem',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
            }}>
              {slide.emoji}
            </div>

            {/* العنوان */}
            <h4 style={{
              textAlign: 'center', fontWeight: 800,
              color: 'var(--text-main)',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.3rem',
              lineHeight: 1.8,
              marginBottom: '1rem',
            }}>
              {slide.title}
            </h4>

            {/* النص */}
            <p style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              lineHeight: 1.8,
              fontSize: '0.95rem',
              marginBottom: '2rem',
            }}>
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* نقاط التقدم */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
              style={{
                width: i === index ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === index ? slide.color : 'var(--border-color)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* أزرار التنقل */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {index > 0 && (
            <button
              onClick={prev}
              style={{
                background: 'var(--badge-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 20px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              <FiArrowRight size={16} /> السابق
            </button>
          )}
          <button
            onClick={next}
            style={{
              background: `linear-gradient(135deg, var(--primary-color), ${slide.color})`,
              border: 'none',
              borderRadius: '12px',
              padding: '10px 28px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.9rem', fontWeight: 700,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {isLast ? 'ابدأ الآن 🚀' : (<>التالي <FiArrowLeft size={16} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
};

// يُصدَّر hook لتحديد ما إذا يجب عرض الـ onboarding
// eslint-disable-next-line react-refresh/only-export-components -- دالة مساعدة مشتركة صغيرة
export function shouldShowOnboarding() {
  return !localStorage.getItem(STORAGE_KEY);
}

export default OnboardingSlides;
