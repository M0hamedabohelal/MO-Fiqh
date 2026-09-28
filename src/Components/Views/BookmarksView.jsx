import { FiBookmark, FiChevronLeft, FiCloud } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import { useAuth } from '../Auth/AuthContext';

// شاشة المسائل المحفوظة في المفضلة
const BookmarksView = ({ bookmarks, lessons, onOpenLessonById, onBrowse, onOpenLogin }) => {
  const { user } = useAuth();
  const bookmarkedLessons = lessons.filter((l) => bookmarks.includes(l.id));

  return (
    <div className="mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
          <FiBookmark className="ms-2" /> المفضلة
        </h3>
        {!user && (
          <button onClick={onOpenLogin} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
            <FiCloud /> حفظ سحابي
          </button>
        )}
      </div>

      {!user && bookmarks.length > 0 && (
        <div className="alert alert-warning py-2 small d-flex align-items-center gap-2" role="alert">
          <FiCloud size={18} />
          <span>أنت تتصفح كضيف. <a href="#" onClick={(e) => { e.preventDefault(); onOpenLogin(); }} className="alert-link">سجّل الدخول</a> لحفظ مفضلتك سحابياً.</span>
        </div>
      )}

      {bookmarkedLessons.length === 0 ? (
        <EmptyState
          icon={FiBookmark}
          title="لا توجد مسائل محفوظة"
          message="احفظ المسائل التي تهمك بالضغط على أيقونة المفضلة داخل أي مسألة."
          hint="⭐ ستجدها هنا في أي وقت"
        >
          <button className="btn btn-primary mt-1" onClick={onBrowse}>
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
