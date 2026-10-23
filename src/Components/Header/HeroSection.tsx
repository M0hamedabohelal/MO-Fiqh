import { useState, useEffect, useRef } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiUser, FiYoutube, FiBookOpen } from 'react-icons/fi';
import type { User } from 'firebase/auth';
import logo from '../../assets/logo-circle.webp';
import styles from './HeroSection.module.css';

const slides = [
  {
    subtitle: 'منصة تعليمية متكاملة لدراسة الفقه الإسلامي',
    description: 'تصفّح الكتب والأبواب والمسائل الفقهية بأسلوب عصري ميسّر مع شرح صوتي ومرئي',
  },
  {
    subtitle: 'شرح ميسّر لأحكام الفقه الإسلامي',
    description: 'استمع إلى شرح العلماء وتابع المسائل الفقهية خطوة بخطوة',
  },
  {
    subtitle: 'رحلتك في طلب العلم الشرعي تبدأ هنا',
    description: 'مكتبة فقهية رقمية شاملة تضم الكتب والأبواب والمسائل مع الشرح الصوتي',
  },
];

interface HeroSectionProps {
  onStartBrowsing: () => void;
  stopLessonTitle?: string;
  onContinueStopMark: () => void;
  onOpenLogin: () => void;
  user: User | null;
}

const HeroSection = ({ onStartBrowsing, stopLessonTitle, onContinueStopMark, onOpenLogin, user }: HeroSectionProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [slideVisible, setSlideVisible] = useState(true);
  // مؤقت الانتقال اليدوي — يُمسح عند التنظيف/إعادة الضغط لمنع setState بعد الإزالة
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-slide with fade transition — يُحترم تفضيل تقليل الحركة، ويُمسح المؤقت الداخلي عند التنظيف
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let inner: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setSlideVisible(false);
      inner = setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setSlideVisible(true);
      }, 600); // slightly longer for the new elegant transition
    }, 6000);
    return () => {
      clearInterval(interval);
      if (inner) clearTimeout(inner);
    };
  }, []);

  // مسح مؤقت الانتقال عند إلغاء تركيب المكوّن (الانتقال من شاشة البداية مثلًا)
  useEffect(() => () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  }, []);

  const goToSlide = (index: number) => {
    if (index === currentSlide) return;
    setSlideVisible(false);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      setCurrentSlide(index);
      setSlideVisible(true);
    }, 400);
  };

  const nextSlide = () => {
    setSlideVisible(false);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setSlideVisible(true);
    }, 400);
  };

  const prevSlide = () => {
    setSlideVisible(false);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setSlideVisible(true);
    }, 400);
  };

  return (
    <section className={`${styles['hero-section']} ${isVisible ? styles['hero-visible'] : ''}`} id="hero-section">
      {/* Dynamic Animated Background Patterns */}
      <div className={`${styles['hero-bg-layer']} ${styles['hero-bg-pattern']}`}></div>
      <div className={`${styles['hero-bg-layer']} ${styles['hero-bg-gradient']}`}></div>

      {/* Decorative Corner Ornaments */}
      <div className={`${styles['hero-corner']} ${styles['hero-corner-tr']}`}></div>
      <div className={`${styles['hero-corner']} ${styles['hero-corner-bl']}`}></div>

      {/* Login Button */}
      <button className={`${styles['hero-login-btn']} ${styles['premium-glass']}`} onClick={onOpenLogin} title={user ? `حساب: ${user.displayName || user.email}` : 'تسجيل الدخول'}>
        <div className={styles['login-btn-inner']}>
          <FiUser size={18} />
          <span>{user ? (user.displayName || user.email || 'حسابي') : 'تسجيل الدخول'}</span>
        </div>
      </button>

      <div className={styles['hero-main-container']}>
        {/* Arch Frame */}
        <div className={styles['hero-arch-frame']}>
          <div className={styles['hero-arch-inner']}>

            {/* Logo area with rotating mandala */}
            <div className={styles['hero-logo-showcase']}>
              <div className={styles['hero-mandala-bg']}></div>
              <img
                src={logo}
                alt="شعار يَسِّر"
                className={styles['hero-logo-img']}
                width="150"
                height="150"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            {/* Title with Gold separator */}
            <div className={styles['hero-title-area']}>
              <h1 className={styles['hero-title']}>يَسِّر</h1>
              <div className={styles['hero-separator']}>
                <span className={styles['sep-line']}></span>
                <span className={styles['sep-icon']}>✦</span>
                <span className={styles['sep-line']}></span>
              </div>
            </div>

            {/* Elegant Slider */}
            <div className={styles['hero-slider-wrapper']}>
              <button className={`${styles['hero-nav-btn']} prev-btn`} onClick={prevSlide} aria-label="السابق">
                <FiChevronRight size={24} />
              </button>

              <div className={`${styles['hero-slider-content']} ${styles['premium-glass']}`}>
                <div className={`${styles['slider-border-ornament']} ${styles['top-ornament']}`}></div>
                <div className={`${styles['slide-content-inner']} ${slideVisible ? styles['slide-active'] : styles['slide-exit']}`}>
                  <h2 className={styles['slide-subtitle']}>{slides[currentSlide].subtitle}</h2>
                  <p className={styles['slide-desc']}>{slides[currentSlide].description}</p>
                </div>
                <div className={`${styles['slider-border-ornament']} ${styles['bottom-ornament']}`}></div>
              </div>

              <button className={`${styles['hero-nav-btn']} next-btn`} onClick={nextSlide} aria-label="التالي">
                <FiChevronLeft size={24} />
              </button>
            </div>

            {/* Dots */}
            <div className={styles['hero-dots-container']}>
              {slides.map((_, index: number) => (
                <button
                  key={index}
                  className={`${styles['hero-dot']} ${index === currentSlide ? styles['active'] : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`الشريحة ${index + 1}`}
                >
                  <span className={styles['dot-inner']}></span>
                </button>
              ))}
            </div>

            {/* Call to Actions */}
            <div className={styles['hero-actions-container']}>
              <button className={styles['hero-btn-primary']} onClick={onStartBrowsing}>
                <span className={styles['btn-shine']}></span>
                <FiBookOpen className={styles['btn-icon']} size={22} />
                <span className={styles['btn-text']}>ابدأ التصفح الآن</span>
              </button>

              <div className={styles['hero-secondary-actions']}>
                <a className={styles['hero-btn-secondary']} href="/fiqh-book.pdf" download="الفقه.pdf">
                  <FiDownload size={18} />
                  <span>تحميل الكتاب</span>
                </a>
                <a className={styles['hero-btn-secondary']} href="https://www.youtube.com/playlist?list=PL1i_D1Vw3d5P5Q6IHHW22JHrnLCwm60Bn" target="_blank" rel="noopener noreferrer">
                  <FiYoutube size={18} />
                  <span>السلسلة المرئية</span>
                </a>
              </div>

              {stopLessonTitle && (
                <button className={styles['hero-stop-continue']} onClick={onContinueStopMark}>
                  <span className={styles['stop-mark-dot']} aria-hidden="true" />
                  <span>أكمل من علامة الوقوف: {stopLessonTitle}</span>
                  <FiChevronLeft size={16} />
                </button>
              )}

            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
