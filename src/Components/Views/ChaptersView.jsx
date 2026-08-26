import { FiBook, FiList, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';

// شاشة أبواب الكتاب الواحد (أكورديون بكل باب ومسائله)
const ChaptersView = ({ bookName, chapters, openChapterName, onToggleChapter, onSelectLesson }) => (
  <div className="mt-4">
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
      <FiList className="ms-2" /> {bookName} - الفصول
    </h3>

    {chapters.length === 0 ? (
      <EmptyState
        icon={FiBook}
        title="هذا الكتاب فارغ حالياً"
        message="لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد."
      />
    ) : (
      <div className="d-flex flex-column gap-3">
        {chapters.map(({ chapterName, issues }) => {
          const isOpen = openChapterName === chapterName;

          return (
            <div key={chapterName} className="custom-card shadow-sm overflow-hidden">
              <button
                className="btn w-100 text-end p-4 d-flex justify-content-between align-items-center list-btn border-0"
                onClick={() => onToggleChapter(chapterName)}
                aria-expanded={isOpen}
              >
                <span>{chapterName}</span>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-muted small">{issues.length} مسائل</span>
                  {isOpen ? (
                    <FiChevronRight style={{ color: 'var(--accent-color)' }} />
                  ) : (
                    <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3">
                  {issues.map((lesson) => (
                    <LessonListItem
                      key={lesson.id}
                      title={lesson.title}
                      pageNumber={lesson.pageNumber}
                      isRead={lesson.isRead}
                      onClick={() => onSelectLesson(lesson)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default ChaptersView;
