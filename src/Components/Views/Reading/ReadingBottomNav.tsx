import { FiChevronLeft, FiChevronRight, FiBookOpen } from 'react-icons/fi';

interface ReadingBottomNavProps {
  currentIndex: number;
  totalLessons: number;
  pageNumber?: string | number | null;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const ReadingBottomNav = ({
  currentIndex,
  totalLessons,
  pageNumber,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
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
          className="btn nav-lesson-btn"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="الانتقال إلى المسألة السابقة"
        >
          <FiChevronRight aria-hidden="true" size={18} />
          <span>
            <span className="d-none d-sm-inline">المسألة </span>السابقة
          </span>
        </button>
        <button
          type="button"
          className="btn nav-lesson-btn"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="الانتقال إلى المسألة التالية"
        >
          <span>
            <span className="d-none d-sm-inline">المسألة </span>التالية
          </span>
          <FiChevronLeft aria-hidden="true" size={18} />
        </button>
      </div>
    </nav>
  );
};

