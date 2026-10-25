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
  FiCompass,
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
  onSelectBook?: (bookName: string) => void;
  booksStats?: { bookName: string; chaptersCount: number; issuesCount: number }[];
}

const toArDigits = (n: number): string =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

const HeroSection = ({
  onStartBrowsing,
  stopLessonTitle,
  onContinueStopMark,
  onOpenLogin,
  user,
  onSelectBook,
  booksStats,
}: HeroSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const taharahStats = booksStats?.find((b) => b.bookName === 'كتاب الطهارة');
  const salatStats = booksStats?.find((b) => b.bookName === 'كتاب الصلاة');

  const taharahChapters = taharahStats?.chaptersCount ?? 10;
  const taharahIssues = taharahStats?.issuesCount ?? 53;

  const salatChapters = salatStats?.chaptersCount ?? 5;
  const salatIssues = salatStats?.issuesCount ?? 32;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const handleBookClick = (bookName: string) => {
    if (onSelectBook) {
      onSelectBook(bookName);
    } else {
      onStartBrowsing();
    }
  };

  return (
    <section
      className={`${styles['hero-container']} ${isVisible ? styles['visible'] : ''}`}
      id="hero-section"
      aria-label="الصفحة الترحيبية لمنصة يَسِّر"
    >
      {/* خلفيات إضاءة أثيرية هادئة ومريحة للعين */}
      <div className={styles['ambient-mesh']} aria-hidden="true" />
      <div className={styles['ambient-glow-gold']} aria-hidden="true" />
      <div className={styles['ambient-glow-emerald']} aria-hidden="true" />

      {/* الشريط العلوي (Header Bar) */}
      <header className={styles['top-bar']}>
        <div className={styles['brand-pill']}>
          <img
            src={logo}
            alt=""
            className={styles['brand-pill-img']}
            width="44"
            height="44"
            loading="eager"
          />
          <div className={styles['brand-text-col']}>
            <span className={styles['brand-pill-title']}>يَسِّر</span>
            <span className={styles['brand-pill-tag']}>منصة شرح الفقه الميسر</span>
          </div>
        </div>

        <button
          className={styles['user-btn']}
          onClick={onOpenLogin}
          type="button"
          title={user ? `حساب: ${user.displayName || user.email}` : 'تسجيل الدخول'}
        >
          <span className={styles['user-btn-icon']}>
            <FiUser size={22} />
          </span>
          <span className={styles['user-btn-label']}>
            {user ? (user.displayName || user.email?.split('@')[0] || 'حسابي') : 'تسجيل الدخول'}
          </span>
          {user && <span className={styles['user-status-dot']} />}
        </button>
      </header>

      {/* المسرح الرئيسي المتوازن — يستغل المساحات أفقياً وعمودياً */}
      <main className={styles['main-stage']}>
        {/* الجانب الأيمن: الهوية والنصوص والأزرار الأساسية */}
        <div className={styles['info-column']}>
          <div className={styles['badge-capsule']}>
            <span className={styles['badge-sparkle']}>✦</span>
            <span>في ضوء الكتاب والسنة • قراءة وشرح صوتي</span>
            <span className={styles['badge-sparkle']}>✦</span>
          </div>

          <h1 className={styles['hero-heading']}>يَسِّر</h1>

          <p className={styles['hero-subtitle']}>
            «الفقه الميسر في رداءٍ عصري»
          </p>

          <p className={styles['hero-description']}>
            منصة تعليمية تفاعلية لدراسة أحكام الفقه الإسلامي بأسلوب منهجي مبسّط، تجمع بين تحرير المسائل والشرح الصوتي المتقن مع المزامنة السحابية الذكية.
          </p>

          {/* أزرار الإجراء الرئيسية */}
          <div className={styles['actions-wrapper']}>
            <button
              className={styles['btn-main-cta']}
              onClick={onStartBrowsing}
              type="button"
            >
              <FiBookOpen size={22} className={styles['btn-cta-icon']} />
              <span className={styles['btn-cta-text']}>تصفّح أبواب الفقه الآن</span>
              <FiArrowLeft size={20} className={styles['btn-cta-arrow']} />
            </button>

            <div className={styles['secondary-row']}>
              <a
                className={styles['btn-ghost']}
                href={import.meta.env.VITE_FIQH_PDF_URL || '/fiqh-book.pdf'}
                download="الفقه-الميسر.pdf"
                title="تحميل الكتاب كاملًا بصيغة PDF"
              >
                <FiDownload size={16} />
                <span>تحميل الكتاب PDF</span>
              </a>

              <a
                className={styles['btn-ghost']}
                href="https://www.youtube.com/playlist?list=PL1i_D1Vw3d5P5Q6IHHW22JHrnLCwm60Bn"
                target="_blank"
                rel="noopener noreferrer"
                title="مشاهدة السلسلة المرئية على يوتيوب"
              >
                <FiYoutube size={17} className={styles['yt-icon']} />
                <span>السلسلة المرئية</span>
              </a>
            </div>
          </div>

          {/* وسوم المزايا العصرية */}
          <div className={styles['features-strip']}>
            <div className={styles['feature-chip']}>
              <span className={styles['chip-icon']}><FiLayers size={15} /></span>
              <span>٨٥ مسألة مُحققة</span>
            </div>
            <div className={styles['feature-chip']}>
              <span className={styles['chip-icon']}><FiHeadphones size={15} /></span>
              <span>شرح صوتي متقن</span>
            </div>
            <div className={styles['feature-chip']}>
              <span className={styles['chip-icon']}><FiBookmark size={15} /></span>
              <span>مزامنة سحابية فورية</span>
            </div>
          </div>
        </div>

        {/* الجانب الأيسر: الشعار الفاخر وبطاقات البوابات السريعة */}
        <div className={styles['portal-column']}>
          {/* الشعار المركزي الفاخر */}
          <div className={styles['emblem-showcase']}>
            <div className={styles['emblem-ring']} />
            <div className={styles['emblem-core']}>
              <img
                src={logo}
                alt="شعار منصة يَسِّر"
                className={styles['emblem-img']}
                width="140"
                height="140"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

          {/* بطاقة مواصلة القراءة من آخر وقفة (إذا وُجدت) */}
          {stopLessonTitle && (
            <button
              className={styles['resume-card']}
              onClick={onContinueStopMark}
              type="button"
            >
              <div className={styles['resume-header']}>
                <span className={styles['resume-badge']}>
                  <FiBookmark size={14} />
                  <span>آخر وقفة</span>
                </span>
                <span className={styles['resume-action']}>
                  <span>متابعة</span>
                  <FiArrowLeft size={14} />
                </span>
              </div>
              <p className={styles['resume-text']}>{stopLessonTitle}</p>
            </button>
          )}

          {/* بوابات الكتب الفقهية السريعة */}
          <div className={styles['books-portal-grid']}>
            <button
              type="button"
              className={`${styles['book-portal-card']} ${styles['taharah-card']}`}
              onClick={() => handleBookClick('كتاب الطهارة')}
            >
              <div className={styles['book-card-header']}>
                <span className={styles['book-badge']}>الكتاب الأول</span>
                <FiCompass size={16} className={styles['book-icon']} />
              </div>
              <h3 className={styles['book-card-title']}>كتاب الطهارة</h3>
              <p className={styles['book-card-meta']}>
                {toArDigits(taharahChapters)} أبواب • {toArDigits(taharahIssues)} مسألة فقهية
              </p>
            </button>

            <button
              type="button"
              className={`${styles['book-portal-card']} ${styles['salat-card']}`}
              onClick={() => handleBookClick('كتاب الصلاة')}
            >
              <div className={styles['book-card-header']}>
                <span className={styles['book-badge']}>الكتاب الثاني</span>
                <FiCompass size={16} className={styles['book-icon']} />
              </div>
              <h3 className={styles['book-card-title']}>كتاب الصلاة</h3>
              <p className={styles['book-card-meta']}>
                {toArDigits(salatChapters)} أبواب • {toArDigits(salatIssues)} مسألة فقهية
              </p>
            </button>
          </div>
        </div>
      </main>

      {/* التذييل: الحديث الشريف النبوي كما طلب المستخدم بدلاً من وقف لله */}
      <footer className={styles['bottom-bar']}>
        <div className={styles['hadith-container']}>
          <span className={styles['hadith-ornament']}>✦</span>
          <span className={styles['hadith-text']}>
            قال رسول الله ﷺ: «مَنْ يُرِدِ اللهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ»
          </span>
          <span className={styles['hadith-ornament']}>✦</span>
        </div>
      </footer>
    </section>
  );
};

export default HeroSection;
