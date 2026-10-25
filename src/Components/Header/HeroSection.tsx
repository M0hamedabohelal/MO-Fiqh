import { useState, useEffect } from 'react';
import {
  FiBookOpen,
  FiArrowLeft,
  FiDownload,
  FiYoutube,
  FiUser,
  FiBookmark,
  FiHeadphones,
  FiLayers,
} from 'react-icons/fi';
import type { User } from 'firebase/auth';
import logo from '../../assets/logo-circle.webp';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  onStartBrowsing: () => void;
  stopLessonTitle?: string;
  onContinueStopMark: () => void;
  onOpenLogin: () => void;
  user: User | null;
}

const HeroSection = ({
  onStartBrowsing,
  stopLessonTitle,
  onContinueStopMark,
  onOpenLogin,
  user,
}: HeroSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className={`${styles['hero-container']} ${isVisible ? styles['visible'] : ''}`}
      id="hero-section"
      aria-label="الصفحة الترحيبية لمنصة يَسِّر"
    >
      {/* خلفيات إضاءة أثيرية وزخرفة عصرية راقية */}
      <div className={styles['ambient-mesh']} aria-hidden="true" />
      <div className={styles['ambient-glow-gold']} aria-hidden="true" />
      <div className={styles['ambient-glow-emerald']} aria-hidden="true" />
      <div className={styles['pattern-overlay']} aria-hidden="true" />

      {/* الشريط العلوي المصغر (Header Bar) */}
      <header className={styles['top-bar']}>
        <div className={styles['brand-pill']}>
          <img
            src={logo}
            alt=""
            className={styles['brand-pill-img']}
            width="26"
            height="26"
            loading="eager"
          />
          <span className={styles['brand-pill-title']}>يَسِّر</span>
          <span className={styles['brand-pill-dot']} />
          <span className={styles['brand-pill-tag']}>منصة الفقه الميسر</span>
        </div>

        <button
          className={styles['user-btn']}
          onClick={onOpenLogin}
          type="button"
          title={user ? `حساب: ${user.displayName || user.email}` : 'تسجيل الدخول'}
        >
          <span className={styles['user-btn-icon']}>
            <FiUser size={15} />
          </span>
          <span className={styles['user-btn-label']}>
            {user ? (user.displayName || user.email?.split('@')[0] || 'حسابي') : 'تسجيل الدخول'}
          </span>
          {user && <span className={styles['user-status-dot']} />}
        </button>
      </header>

      {/* المحتوى المركزي الترحيبي */}
      <main className={styles['main-stage']}>
        {/* الشعار المركزي الفاخر مع حلقة الإضاءة الهادئة */}
        <div className={styles['emblem-wrapper']}>
          <div className={styles['emblem-ring']} />
          <div className={styles['emblem-core']}>
            <img
              src={logo}
              alt="شعار منصة يَسِّر"
              className={styles['emblem-img']}
              width="98"
              height="98"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>

        {/* الكبسولة العلوية التقديمية */}
        <div className={styles['badge-capsule']}>
          <span className={styles['badge-sparkle']}>✦</span>
          <span>في ضوء الكتاب والسنة • قراءة وشرح صوتي</span>
          <span className={styles['badge-sparkle']}>✦</span>
        </div>

        {/* العنوان والوصف */}
        <div className={styles['title-group']}>
          <h1 className={styles['hero-heading']}>يَسِّر</h1>
          <p className={styles['hero-subtitle']}>
            «الفقه الميسر في رداءٍ عصري»
          </p>
          <p className={styles['hadith-quote']}>
            «مَنْ يُرِدِ اللهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ»
          </p>
        </div>

        {/* بطاقات المزايا الثلاث العصرية (Bento Chips) */}
        <div className={styles['features-strip']}>
          <div className={styles['feature-chip']}>
            <span className={styles['chip-icon']}><FiLayers size={14} /></span>
            <span>٨٥ مسألة مُحققة</span>
          </div>
          <div className={styles['feature-chip']}>
            <span className={styles['chip-icon']}><FiHeadphones size={14} /></span>
            <span>شرح صوتي متقن</span>
          </div>
          <div className={styles['feature-chip']}>
            <span className={styles['chip-icon']}><FiBookmark size={14} /></span>
            <span>مزامنة سحابية فورية</span>
          </div>
        </div>

        {/* شريط مواصلة القراءة من علامة الوقف إن وجدت */}
        {stopLessonTitle && (
          <button
            className={styles['resume-card']}
            onClick={onContinueStopMark}
            type="button"
          >
            <span className={styles['resume-badge']}>
              <FiBookmark size={13} />
              <span>آخر وقفة</span>
            </span>
            <span className={styles['resume-text']}>{stopLessonTitle}</span>
            <span className={styles['resume-action']}>
              <span>متابعة</span>
              <FiArrowLeft size={13} />
            </span>
          </button>
        )}

        {/* أزرار الإجراء الأساسية والثانوية */}
        <div className={styles['cta-container']}>
          <button
            className={styles['btn-main-cta']}
            onClick={onStartBrowsing}
            type="button"
          >
            <FiBookOpen size={19} className={styles['btn-cta-icon']} />
            <span className={styles['btn-cta-text']}>تصفّح أبواب الفقه الآن</span>
            <FiArrowLeft size={17} className={styles['btn-cta-arrow']} />
          </button>

          <div className={styles['secondary-row']}>
            <a
              className={styles['btn-ghost']}
              href={import.meta.env.VITE_FIQH_PDF_URL || '/fiqh-book.pdf'}
              download="الفقه-الميسر.pdf"
              title="تحميل الكتاب كاملًا بصيغة PDF"
            >
              <FiDownload size={15} />
              <span>تحميل الكتاب PDF</span>
            </a>

            <a
              className={styles['btn-ghost']}
              href="https://www.youtube.com/playlist?list=PL1i_D1Vw3d5P5Q6IHHW22JHrnLCwm60Bn"
              target="_blank"
              rel="noopener noreferrer"
              title="مشاهدة السلسلة المرئية على يوتيوب"
            >
              <FiYoutube size={16} className={styles['yt-icon']} />
              <span>السلسلة المرئية</span>
            </a>
          </div>
        </div>
      </main>

      {/* تذييل ناعم ومختصر */}
      <footer className={styles['bottom-bar']}>
        <span className={styles['footer-text']}>
          وقفٌ لله تعالى • علمٌ يُنتفع به
        </span>
      </footer>
    </section>
  );
};

export default HeroSection;
