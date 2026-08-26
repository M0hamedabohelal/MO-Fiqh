import { FiCheckCircle, FiChevronLeft } from 'react-icons/fi';

// زر المسألة الموحد في فهرس الأبواب والمسائل (شارة مقروء + عنوان + رقم صفحة)
const LessonListItem = ({ title, pageNumber, isRead, onClick }) => (
  <button
    className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-2"
    onClick={onClick}
  >
    <span className="d-flex align-items-center gap-2">
      {isRead && <FiCheckCircle size={16} className="lesson-read-badge flex-shrink-0" />}
      {title}
    </span>
    <span className="d-flex align-items-center gap-3">
      <span className="text-muted small">ص {pageNumber}</span>
      <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
    </span>
  </button>
);

export default LessonListItem;
