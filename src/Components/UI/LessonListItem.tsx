import { memo } from 'react';
import { FiCheckCircle, FiChevronLeft } from 'react-icons/fi';

interface LessonListItemProps {
  title: string;
  pageNumber?: string;
  isRead?: boolean;
  isNew?: boolean;
  onClick: () => void;
  variant?: 'toc';
}

// زر المسألة الموحد في فهرس الأبواب والمسائل (شارة مقروء + شارة جديد + عنوان + رقم صفحة)
// variant="toc": صف فهرس تراثي (عنوان + نقاط + رقم الصفحة) لصفحة الأبواب
const LessonListItem = ({ title, pageNumber, isRead, isNew, onClick, variant }: LessonListItemProps) => {
  if (variant === 'toc') {
    return (
      <button className="toc-row" onClick={onClick}>
        <span className="toc-title">
          {isRead && <FiCheckCircle size={15} className="lesson-read-badge flex-shrink-0" />}
          {isNew && !isRead && <span className="new-badge flex-shrink-0">جديد</span>}
          {title}
        </span>
        <span className="toc-dots" aria-hidden="true" />
        <span className="toc-page">ص {pageNumber}</span>
      </button>
    );
  }
  return (
  <button
    className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-2"
    onClick={onClick}
  >
    <span className="d-flex align-items-center gap-2">
      {isRead && <FiCheckCircle size={16} className="lesson-read-badge flex-shrink-0" />}
      {isNew && !isRead && <span className="new-badge flex-shrink-0">جديد</span>}
      {title}
    </span>
    <span className="d-flex align-items-center gap-3">
      <span className="text-muted small">ص {pageNumber}</span>
      <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
    </span>
  </button>
  );
};

export default memo(LessonListItem);
