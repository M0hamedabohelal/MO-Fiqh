import { FiChevronLeft, FiChevronRight, FiBookOpen } from 'react-icons/fi';

interface ReadingBottomNavProps {
  currentIndex: number;
  totalLessons: number;
  pageNumber?: string | number | null;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLessonTitle?: string;
  nextLessonTitle?: string;
}

export const ReadingBottomNav = ({
  currentIndex,
  totalLessons,
  pageNumber,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  prevLessonTitle,
  nextLessonTitle,
}: ReadingBottomNavProps) => {
  const hasPage = Boolean(String(pageNumber ?? '').trim());

  return (
    <nav className="reading-bottom-nav" aria-label="التنقل للدرس السابق أو التالي">
      <div className="reading-bottom-nav-meta">
        <span className="reading-meta-pill">
          المسألة {currentIndex + 1} من {totalLessons}
        </span>
        {hasPage && (
          <span className="reading-meta-pill">
            <FiBookOpen size={14} aria-hidden="true" />
            <span>صفحة {pageNumber}</span>
          </span>
        )}
      </div>
      <div className="reading-bottom-nav-buttons">
        <button
          type="button"
          className="btn nav-lesson-btn d-flex align-items-center gap-2"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label={prevLessonTitle ? `الانتقال إلى المسألة السابقة: ${prevLessonTitle}` : 'الانتقال إلى المسألة السابقة'}
          title={prevLessonTitle || 'المسألة السابقة'}
        >
          <FiChevronRight aria-hidden="true" size={20} className="flex-shrink-0" />
          <div className="d-flex flex-column text-end flex-grow-1 overflow-hidden">
            <span className="nav-btn-label">
              <span className="d-none d-sm-inline">المسألة </span>السابقة
            </span>
            {prevLessonTitle && (
              <span className="nav-lesson-preview text-truncate">
                {prevLessonTitle}
              </span>
            )}
          </div>
        </button>
        <button
          type="button"
          className="btn nav-lesson-btn d-flex align-items-center gap-2"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label={nextLessonTitle ? `الانتقال إلى المسألة التالية: ${nextLessonTitle}` : 'الانتقال إلى المسألة التالية'}
          title={nextLessonTitle || 'المسألة التالية'}
        >
          <div className="d-flex flex-column text-start flex-grow-1 overflow-hidden">
            <span className="nav-btn-label">
              <span className="d-none d-sm-inline">المسألة </span>التالية
            </span>
            {nextLessonTitle && (
              <span className="nav-lesson-preview text-truncate">
                {nextLessonTitle}
              </span>
            )}
          </div>
          <FiChevronLeft aria-hidden="true" size={20} className="flex-shrink-0" />
        </button>
      </div>
    </nav>
  );
};

