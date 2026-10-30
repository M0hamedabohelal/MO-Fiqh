import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export interface ReadingTopNavProps {
  currentIndex: number;
  totalLessons: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLessonTitle?: string;
  nextLessonTitle?: string;
}

/**
 * شريط التنقل العلوي بين المسائل (ReadingTopNav)
 * يتيح للقارئ الانتقال السريع للمسألة السابقة أو التالية من أعلى الشاشة
 * دون مزاحمة شريط الأدوات الرئيسي، وبتصميم متجاوب وجميل يتناسق مع شريط التنقل السفلي.
 */
export const ReadingTopNav = ({
  currentIndex,
  totalLessons,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  prevLessonTitle,
  nextLessonTitle,
}: ReadingTopNavProps) => {
  return (
    <nav
      className="reading-top-nav d-flex justify-content-between align-items-center gap-2"
      aria-label="التنقل العلوي بين المسائل"
    >
      {/* زر المسألة السابقة */}
      <button
        type="button"
        className="btn nav-top-btn prev d-flex align-items-center gap-1 gap-md-2"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label={prevLessonTitle ? `المسألة السابقة: ${prevLessonTitle}` : 'المسألة السابقة'}
        title={prevLessonTitle || 'المسألة السابقة'}
      >
        <FiChevronRight size={18} className="flex-shrink-0" />
        <div className="d-flex flex-column text-end overflow-hidden">
          <span className="nav-top-label">
            <span className="d-none d-sm-inline">المسألة </span>السابقة
          </span>
          {prevLessonTitle && (
            <span className="nav-top-preview d-none d-lg-block text-truncate">
              {prevLessonTitle}
            </span>
          )}
        </div>
      </button>

      {/* مؤشر رقم المسألة في المنتصف */}
      <div className="reading-top-nav-counter">
        <span className="badge-pill-counter">
          المسألة {currentIndex + 1} من {totalLessons}
        </span>
      </div>

      {/* زر المسألة التالية */}
      <button
        type="button"
        className="btn nav-top-btn next d-flex align-items-center gap-1 gap-md-2"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={nextLessonTitle ? `المسألة التالية: ${nextLessonTitle}` : 'المسألة التالية'}
        title={nextLessonTitle || 'المسألة التالية'}
      >
        <div className="d-flex flex-column text-start overflow-hidden">
          <span className="nav-top-label">
            <span className="d-none d-sm-inline">المسألة </span>التالية
          </span>
          {nextLessonTitle && (
            <span className="nav-top-preview d-none d-lg-block text-truncate">
              {nextLessonTitle}
            </span>
          )}
        </div>
        <FiChevronLeft size={18} className="flex-shrink-0" />
      </button>
    </nav>
  );
};
