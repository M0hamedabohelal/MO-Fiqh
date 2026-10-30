import { memo } from 'react';
import {
  FiCheckCircle,
  FiChevronLeft,
  FiFlag,
  FiVideo,
  FiVolume2,
  FiInfo,
  FiBookmark,
  FiEdit3,
} from 'react-icons/fi';

interface LessonListItemProps {
  title: string;
  pageNumber?: string;
  isRead?: boolean;
  isStopMark?: boolean;
  hasVideo?: boolean;
  hasAudio?: boolean;
  hasAdminNote?: boolean;
  hasBookmark?: boolean;
  hasNotes?: boolean;
  onClick: () => void;
  variant?: 'toc';
}

// زر المسألة الموحد في فهرس الأبواب والمسائل (✓ مقروء + عنوان + شارات نوع المحتوى + رقم صفحة)
const LessonListItem = ({
  title,
  pageNumber,
  isRead,
  isStopMark,
  hasVideo,
  hasAudio,
  hasAdminNote,
  hasBookmark,
  hasNotes,
  onClick,
  variant,
}: LessonListItemProps) => {
  // شارات وسائط ونوع المحتوى لتوضيح طبيعة المسألة للقارئ
  const renderMediaBadges = (isSmall = false) => {
    if (!hasVideo && !hasAudio && !hasAdminNote && !hasBookmark && !hasNotes) return null;
    const iconSize = isSmall ? 11 : 13;
    return (
      <span className="lesson-item-media-tags d-inline-flex align-items-center gap-1 flex-shrink-0 ms-1">
        {hasVideo && (
          <span className="lesson-tag-icon tag-video" title="يحتوي على شرح مرئي (فيديو)">
            <FiVideo size={iconSize} />
          </span>
        )}
        {hasAudio && (
          <span className="lesson-tag-icon tag-audio" title="يحتوي على تسجيل صوتي">
            <FiVolume2 size={iconSize} />
          </span>
        )}
        {hasAdminNote && (
          <span className="lesson-tag-icon tag-info" title="تحتوي على ملحوظة هامة">
            <FiInfo size={iconSize} />
          </span>
        )}
        {hasBookmark && (
          <span className="lesson-tag-icon tag-bookmark" title="محفوظة في المفضلة">
            <FiBookmark size={iconSize} />
          </span>
        )}
        {hasNotes && (
          <span className="lesson-tag-icon tag-note" title="لديك ملاحظة مدونة عليها">
            <FiEdit3 size={iconSize} />
          </span>
        )}
      </span>
    );
  };

  if (variant === 'toc') {
    return (
      <button className="toc-row" onClick={onClick}>
        <span className="toc-title">
          {isStopMark && <FiFlag size={15} className="lesson-stop-badge flex-shrink-0" aria-label="علامة الوقوف" />}
          {isRead && <FiCheckCircle size={15} className="lesson-read-badge flex-shrink-0" />}
          <span className="toc-title-text">{title}</span>
          {renderMediaBadges(true)}
        </span>
        <span className="toc-dots" aria-hidden="true" />
        <span className="toc-page">{pageNumber ? `ص ${pageNumber}` : ''}</span>
      </button>
    );
  }

  return (
    <button
      className="btn w-100 text-end p-3 p-md-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-2"
      onClick={onClick}
    >
      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0 me-2">
        {isStopMark && <FiFlag size={16} className="lesson-stop-badge flex-shrink-0" aria-label="علامة الوقوف" />}
        {isRead && <FiCheckCircle size={16} className="lesson-read-badge flex-shrink-0" />}
        <span className="lesson-item-title text-truncate">{title}</span>
        {renderMediaBadges(false)}
      </div>
      <div className="d-flex align-items-center gap-2 gap-md-3 flex-shrink-0">
        {pageNumber && <span className="text-muted small">ص {pageNumber}</span>}
        <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
      </div>
    </button>
  );
};

export default memo(LessonListItem);
