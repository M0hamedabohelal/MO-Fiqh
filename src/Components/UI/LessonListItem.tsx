import { memo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
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
import { triggerHaptic } from '../../utils/haptics';

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
  onToggleRead?: () => void;
  onToggleBookmark?: () => void;
}

const SWIPE_THRESHOLD = 50;

// زر المسألة الموحد في فهرس الأبواب والمسائل مع دعم إيماءات السحب التفاعلية (Swipe-to-Action)
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
  onToggleRead,
  onToggleBookmark,
}: LessonListItemProps) => {
  const controls = useAnimation();
  const [swipeDir, setSwipeDir] = useState<'right' | 'left' | null>(null);

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

  const handleClick = () => {
    triggerHaptic('light');
    onClick();
  };

  if (variant === 'toc') {
    return (
      <button className="toc-row" onClick={handleClick}>
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

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 25) {
      setSwipeDir('right');
    } else if (info.offset.x < -25) {
      setSwipeDir('left');
    } else {
      setSwipeDir(null);
    }
  };

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    setSwipeDir(null);
    if (info.offset.x > SWIPE_THRESHOLD && onToggleRead) {
      triggerHaptic('selection');
      onToggleRead();
    } else if (info.offset.x < -SWIPE_THRESHOLD && onToggleBookmark) {
      triggerHaptic('selection');
      onToggleBookmark();
    }
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 450, damping: 28 } });
  };

  const hasSwipeActions = Boolean(onToggleRead || onToggleBookmark);

  return (
    <div className="position-relative overflow-hidden mb-2 rounded-3" style={{ touchAction: 'pan-y' }}>
      {/* خلفية الإجراءات عند السحب */}
      {hasSwipeActions && (
        <div
          className="position-absolute inset-0 d-flex justify-content-between align-items-center px-3 rounded-3"
          style={{
            zIndex: 0,
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--badge-bg)',
            border: '1px dashed var(--border-color)',
          }}
          aria-hidden="true"
        >
          {/* سحب لليمين: تمييز كمقروءة */}
          <div
            className="d-flex align-items-center gap-1 fw-bold small"
            style={{
              color: 'var(--tone-success, #2ecc71)',
              opacity: swipeDir === 'right' ? 1 : 0.45,
              transform: swipeDir === 'right' ? 'scale(1.05)' : 'scale(0.95)',
              transition: 'all 0.15s ease',
            }}
          >
            <FiCheckCircle size={18} />
            <span>{isRead ? 'غير مقروءة' : 'مقروءة'}</span>
          </div>

          {/* سحب لليسار: إضافة/إزالة من المفضلة */}
          <div
            className="d-flex align-items-center gap-1 fw-bold small"
            style={{
              color: 'var(--brand-gold, #d8a06a)',
              opacity: swipeDir === 'left' ? 1 : 0.45,
              transform: swipeDir === 'left' ? 'scale(1.05)' : 'scale(0.95)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{hasBookmark ? 'إزالة المفضلة' : 'مفضلة'}</span>
            <FiBookmark size={18} />
          </div>
        </div>
      )}

      {/* بطاقة المسألة القابلة للسحب */}
      <motion.div
        animate={controls}
        drag={hasSwipeActions ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <button
          type="button"
          className="btn w-100 text-end p-3 p-md-4 shadow-sm d-flex justify-content-between align-items-center list-btn m-0 perf-contain-list-item"
          onClick={handleClick}
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
      </motion.div>
    </div>
  );
};

export default memo(LessonListItem);
