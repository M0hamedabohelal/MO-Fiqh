import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiUser, FiYoutube } from 'react-icons/fi';
import logo from '../../assets/logo.png';
import './HeroSection.css';

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

const HeroSection = ({ onStartBrowsing, lastReadTitle, onContinueReading, onOpenLogin, user }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [slideVisible, setSlideVisible] = useState(true);

  // Initial entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-slide with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideVisible(false);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setSlideVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    if (index === currentSlide) return;
    setSlideVisible(false);
    setTimeout(() => {
      setCurrentSlide(index);
      setSlideVisible(true);
    }, 400);
  };

  const nextSlide = () => {
    setSlideVisible(false);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setSlideVisible(true);
    }, 400);
  };

  const prevSlide = () => {
    setSlideVisible(false);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setSlideVisible(true);
    }, 400);
  };

  return (
    <section className={`hero-section ${isVisible ? 'hero-visible' : ''}`} id="hero-section">
      {/* Islamic geometric pattern overlay */}
      <div className="hero-pattern" aria-hidden="true"></div>

      {/* Decorative elements */}
      <div className="hero-glow hero-glow-1" aria-hidden="true"></div>
      <div className="hero-glow hero-glow-2" aria-hidden="true"></div>

      {/* زر تسجيل الدخول */}
      <button className="hero-login-btn" onClick={onOpenLogin} title={user ? `حساب: ${user.displayName || user.email}` : 'تسجيل الدخول'}>
        <FiUser size={17} />
        <span>{user ? (user.displayName || user.email || 'حسابي') : 'تسجيل الدخول'}</span>
      </button>

      <div className="hero-content">
        {/* Logo */}
        <div className="hero-logo-wrapper">
          <div className="hero-logo-ring" aria-hidden="true"></div>
          <img
            src={logo}
            alt="شعار الباحث الفقهي"
            className="hero-logo"
            width="140"
            height="140"
          />
        </div>

        {/* Gold accent line */}
        <div className="hero-accent-line" aria-hidden="true"></div>

        {/* Title */}
        <h1 className="hero-title">الباحث الفقهي</h1>

        {/* Slider content */}
        <div className="hero-slider-container">
          <button 
            className="slider-nav-btn slider-prev" 
            onClick={prevSlide}
            aria-label="الشريحة السابقة"
          >
            <FiChevronRight />
          </button>

          <div className="hero-slider">
            <div className={`hero-slide ${slideVisible ? 'slide-visible' : 'slide-hidden'}`}>
              <p className="hero-subtitle">{slides[currentSlide].subtitle}</p>
              <p className="hero-description">{slides[currentSlide].description}</p>
            </div>
          </div>

          <button 
            className="slider-nav-btn slider-next" 
            onClick={nextSlide}
            aria-label="الشريحة التالية"
          >
            <FiChevronLeft />
          </button>
        </div>

        {/* Slide indicators */}
        <div className="hero-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`hero-dot ${index === currentSlide ? 'hero-dot-active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`الانتقال إلى الشريحة ${index + 1}`}
              id={`hero-dot-${index}`}
            >
              {index === currentSlide && <span className="hero-dot-progress"></span>}
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <button
          className="hero-cta"
          onClick={onStartBrowsing}
          id="hero-cta-button"
        >
          <span className="hero-cta-text">ابدأ التصفح</span>
          <svg className="hero-cta-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className="hero-links-wrapper d-flex justify-content-center gap-3 flex-wrap mt-3">
          <a
            className="hero-download"
            href="/fiqh-book.pdf"
            download="الفقه.pdf"
          >
            <FiDownload className="hero-download-icon" size={20} />
            <span>تحميل ملف الكتاب</span>
          </a>

          <a
            className="hero-download"
            href="https://www.youtube.com/playlist?list=PL1i_D1Vw3d5P5Q6IHHW22JHrnLCwm60Bn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FiYoutube className="hero-download-icon" size={20} />
            <span>سلسلة الفقه كاملة</span>
          </a>
        </div>

        {/* Continue Reading Button */}
        {lastReadTitle && (
          <button
            className="hero-cta"
            onClick={onContinueReading}
            id="hero-continue-button"
            style={{ 
              marginTop: '15px', 
              background: 'transparent', 
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              backdropFilter: 'blur(5px)'
            }}
          >
            <span className="hero-cta-text">أكمل: {lastReadTitle}</span>
            <svg className="hero-cta-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
        )}

        {/* Bottom decorative border */}
        <div className="hero-bottom-ornament" aria-hidden="true">
          <svg viewBox="0 0 200 20" className="hero-ornament-svg">
            <path d="M0,10 Q25,0 50,10 T100,10 T150,10 T200,10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
