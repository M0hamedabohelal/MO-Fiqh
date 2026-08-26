import { FiBook, FiFileText, FiList } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';

// شاشة فهرس المسائل الكامل للكتاب المختار (مجمعة حسب الأبواب)
const LessonsView = ({ bookName, chapters, onSelectLesson }) => (
  <div className="mt-4">
    <h3 className="mb-3 fw-bold" style={{ color: 'var(--primary-color)' }}>
      <FiFileText className="ms-2" /> فهرس المسائل
    </h3>
    <div className="text-muted fw-bold mb-4">
      {bookName}
    </div>
    <div className="d-flex flex-column gap-4">
      {chapters.length === 0 && (
        <EmptyState
          icon={FiBook}
          title="لا توجد مسائل حالياً"
          message="لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد."
        />
      )}

      {chapters.map(({ chapterName, issues }) => (
        <section key={chapterName}>
          <h5
            className="fw-bold mb-3 d-flex align-items-center"
            style={{ color: 'var(--primary-color)' }}
          >
            <FiList className="ms-2" /> {chapterName}
          </h5>

          <div className="d-flex flex-column gap-3">
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
        </section>
      ))}
    </div>
  </div>
);

export default LessonsView;
