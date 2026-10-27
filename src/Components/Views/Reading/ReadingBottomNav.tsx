import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

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
  return (
    <nav className="reading-bottom-nav" aria-label="التنقل للدرس السابق أو التالي">
      <div className="reading-bottom-nav-meta">
        <span>المسألة {currentIndex + 1} من {totalLessons}</span>
        {String(pageNumber ?? '').trim() && <span>صفحة {pageNumber}</span>}
      </div>
      <div className="reading-bottom-nav-buttons">
        <button type="button" className="btn nav-lesson-btn" onClick={onPrev} disabled={!canGoPrev}>
          <FiChevronRight aria-hidden="true" /> السابقة
        </button>
        <button type="button" className="btn nav-lesson-btn" onClick={onNext} disabled={!canGoNext}>
          التالية <FiChevronLeft aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
