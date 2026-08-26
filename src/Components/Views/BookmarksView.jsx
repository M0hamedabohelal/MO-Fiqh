import { FiBookmark, FiChevronLeft } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';

// شاشة المسائل المحفوظة في المفضلة
const BookmarksView = ({ bookmarks, lessons, onOpenLessonById, onBrowse }) => {
  const bookmarkedLessons = lessons.filter((l) => bookmarks.includes(l.id));

  return (
    <div className="mt-4 mb-5">
      <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
        <FiBookmark className="ms-2" /> المفضلة
      </h3>
      {bookmarkedLessons.length === 0 ? (
        <EmptyState icon={FiBookmark} message="لا توجد مسائل في المفضلة حالياً.">
          <button className="btn btn-primary mt-3" onClick={onBrowse}>
            تصفح الكتب
          </button>
        </EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {bookmarkedLessons.map((lesson) => (
            <button
              key={lesson.id}
              className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-3"
              onClick={() => onOpenLessonById(lesson.id)}
            >
              <span className="d-flex flex-column gap-1">
                <span>{lesson.title}</span>
                <small className="text-muted">
                  {lesson.bookName} &gt; {lesson.chapterName}
                </small>
              </span>
              <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksView;
