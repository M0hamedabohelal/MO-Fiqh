import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiUser, FiYoutube, FiBookOpen } from 'react-icons/fi';
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
      }, 600); // slightly longer for the new elegant transition
    }, 6000);
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
      {/* Dynamic Animated Background Patterns */}
      <div className="hero-bg-layer hero-bg-pattern"></div>
      <div className="hero-bg-layer hero-bg-gradient"></div>
      
      {/* Decorative Corner Ornaments */}
      <div className="hero-corner hero-corner-tr"></div>
      <div className="hero-corner hero-corner-bl"></div>

      {/* Login Button */}
      <button className="hero-login-btn premium-glass" onClick={onOpenLogin} title={user ? `حساب: ${user.displayName || user.email}` : 'تسجيل الدخول'}>
        <div className="login-btn-inner">
          <FiUser size={18} />
          <span>{user ? (user.displayName || user.email || 'حسابي') : 'تسجيل الدخول'}</span>
        </div>
      </button>

      <div className="hero-main-container">
        {/* Arch Frame */}
        <div className="hero-arch-frame">
          <div className="hero-arch-inner">
            
            {/* Logo area with rotating mandala */}
            <div className="hero-logo-showcase">
              <div className="hero-mandala-bg"></div>
              <img
                src={logo}
                alt="شعار الباحث الفقهي"
                className="hero-logo-img"
                width="150"
                height="150"
              />
            </div>

            {/* Title with Gold separator */}
            <div className="hero-title-area">
              <h1 className="hero-title">الباحث الفقهي</h1>
              <div className="hero-separator">
                <span className="sep-line"></span>
                <span className="sep-icon">✦</span>
                <span className="sep-line"></span>
              </div>
            </div>

            {/* Elegant Slider */}
            <div className="hero-slider-wrapper">
              <button className="hero-nav-btn prev-btn" onClick={prevSlide} aria-label="السابق">
                <FiChevronRight size={24} />
              </button>
              
              <div className="hero-slider-content premium-glass">
                <div className="slider-border-ornament top-ornament"></div>
                <div className={`slide-content-inner ${slideVisible ? 'slide-active' : 'slide-exit'}`}>
                  <h2 className="slide-subtitle">{slides[currentSlide].subtitle}</h2>
                  <p className="slide-desc">{slides[currentSlide].description}</p>
                </div>
                <div className="slider-border-ornament bottom-ornament"></div>
              </div>

              <button className="hero-nav-btn next-btn" onClick={nextSlide} aria-label="التالي">
                <FiChevronLeft size={24} />
              </button>
            </div>

            {/* Dots */}
            <div className="hero-dots-container">
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`الشريحة ${index + 1}`}
                >
                  <span className="dot-inner"></span>
                </button>
              ))}
            </div>

            {/* Call to Actions */}
            <div className="hero-actions-container">
              <button className="hero-btn-primary" onClick={onStartBrowsing}>
                <span className="btn-shine"></span>
                <FiBookOpen className="btn-icon" size={22} />
                <span className="btn-text">ابدأ التصفح الآن</span>
              </button>

              <div className="hero-secondary-actions">
                <a className="hero-btn-secondary" href="/fiqh-book.pdf" download="الفقه.pdf">
                  <FiDownload size={18} />
                  <span>تحميل الكتاب</span>
                </a>
                <a className="hero-btn-secondary" href="https://www.youtube.com/playlist?list=PL1i_D1Vw3d5P5Q6IHHW22JHrnLCwm60Bn" target="_blank" rel="noopener noreferrer">
                  <FiYoutube size={18} />
                  <span>السلسلة المرئية</span>
                </a>
              </div>

              {lastReadTitle && (
                <button className="hero-btn-continue" onClick={onContinueReading}>
                  <div className="pulse-dot"></div>
                  <span>أكمل القراءة: {lastReadTitle}</span>
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
