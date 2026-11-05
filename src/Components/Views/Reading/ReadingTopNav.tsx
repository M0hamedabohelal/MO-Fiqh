import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { triggerHaptic } from '../../../utils/haptics';
import type { Lesson } from '../../../types';

export interface ReadingTopNavProps {
  currentIndex: number;
  totalLessons: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLessonTitle?: string;
  nextLessonTitle?: string;
  chapterLessons?: Lesson[];
  currentLessonId?: number | string;
  readLessonIds?: string[];
  onSelectChapterLesson?: (lesson: Lesson) => void;
}

/**
 * شريط التنقل العلوي بين المسائل (ReadingTopNav)
 * يتيح للقارئ الانتقال السريع للمسألة السابقة أو التالية من أعلى الشاشة
 * دون مزاحمة شريط الأدوات الرئيسي، مع نقاط تفاعلية سريعة لمسائل الباب (Chapter Pager Dots).
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
  chapterLessons,
  currentLessonId,
  readLessonIds,
  onSelectChapterLesson,
}: ReadingTopNavProps) => {
  const handlePrev = () => {
    triggerHaptic('light');
    onPrev();
  };

  const handleNext = () => {
    triggerHaptic('light');
    onNext();
  };

  return (
    <nav
      className="reading-top-nav d-flex justify-content-between align-items-center gap-1 gap-sm-2"
      aria-label="التنقل العلوي بين المسائل"
    >
      {/* زر المسألة السابقة */}
      <button
        type="button"
        className="btn nav-top-btn prev d-flex align-items-center gap-1 gap-md-2"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label={prevLessonTitle ? `المسألة السابقة: ${prevLessonTitle}` : 'المسألة السابقة'}
        title={prevLessonTitle || 'المسألة السابقة'}
      >
        <FiChevronRight size={17} className="flex-shrink-0" />
        <div className="d-flex flex-column text-end overflow-hidden">
          <span className="nav-top-label text-truncate">
            <span className="d-none d-sm-inline">المسألة </span>السابقة
          </span>
          {prevLessonTitle && (
            <span className="nav-top-preview d-none d-lg-block text-truncate">
              {prevLessonTitle}
            </span>
          )}
        </div>
      </button>

      {/* مؤشر رقم المسألة في المنتصف ونقاط مسائل الباب */}
      <div className="reading-top-nav-counter flex-shrink-0 d-flex flex-column align-items-center gap-1">
        <span className="badge-pill-counter">
          المسألة {currentIndex + 1} من {totalLessons}
        </span>
        {chapterLessons && chapterLessons.length > 1 && (
          <div
            className="chapter-pager-dots"
            role="tablist"
            aria-label="مسائل هذا الباب"
          >
            {chapterLessons.map((cl, idx) => {
              const isCurrent = String(cl.id) === String(currentLessonId);
              const isRead = readLessonIds?.includes(String(cl.id));
              return (
                <button
                  key={cl.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`المسألة ${idx + 1}: ${cl.title}`}
                  title={`المسألة ${idx + 1}: ${cl.title}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    onSelectChapterLesson?.(cl);
                  }}
                  className={`chapter-dot ${isCurrent ? 'active' : ''} ${isRead ? 'is-read' : ''}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* زر المسألة التالية */}
      <button
        type="button"
        className="btn nav-top-btn next d-flex align-items-center gap-1 gap-md-2"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label={nextLessonTitle ? `المسألة التالية: ${nextLessonTitle}` : 'المسألة التالية'}
        title={nextLessonTitle || 'المسألة التالية'}
      >
        <div className="d-flex flex-column text-start overflow-hidden">
          <span className="nav-top-label text-truncate">
            <span className="d-none d-sm-inline">المسألة </span>التالية
          </span>
          {nextLessonTitle && (
            <span className="nav-top-preview d-none d-lg-block text-truncate">
              {nextLessonTitle}
            </span>
          )}
        </div>
        <FiChevronLeft size={17} className="flex-shrink-0" />
      </button>
    </nav>
  );
};
