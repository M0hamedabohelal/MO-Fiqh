import React from 'react';
import {
  FiArrowRight,
  FiCheckCircle,
  FiPrinter,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

interface ReadingHeaderBarProps {
  onBackToIndex: () => void;
  isRead: boolean;
  onToggleRead: () => void;
  onPrintChapter: () => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const ReadingHeaderBar = ({
  onBackToIndex,
  isRead,
  onToggleRead,
  onPrintChapter,
  fontSize,
  setFontSize,
  isBookmarked,
  onToggleBookmark,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: ReadingHeaderBarProps) => {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <button
          className="btn btn-sm text-muted d-flex align-items-center"
          aria-label="العودة لفهرس المسائل"
          title="العودة لفهرس المسائل"
          onClick={onBackToIndex}
        >
          <FiArrowRight className="ms-2" /> <span className="d-none d-md-inline">العودة لفهرس المسائل</span>
        </button>
        <div className="reading-actions d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm d-flex align-items-center shadow-sm"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              backgroundColor: isRead ? '#27ae60' : 'var(--badge-bg)',
              borderColor: isRead ? '#27ae60' : 'var(--border-color)',
              color: isRead ? '#fff' : 'var(--text-main)',
              border: '1px solid',
            }}
            onClick={onToggleRead}
            title={isRead ? 'إلغاء تعليم المسألة كمقروءة' : 'تعليم المسألة كمقروءة'}
            aria-label={isRead ? 'إلغاء تعليم المسألة كمقروءة' : 'تعليم المسألة كمقروءة'}
          >
            <FiCheckCircle size={16} className="ms-1" />
            <span className="d-none d-sm-inline">{isRead ? 'خلصتها' : 'خلصتها؟'}</span>
          </button>

          <button
            className="btn btn-sm d-flex align-items-center shadow-sm"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              backgroundColor: 'var(--badge-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--primary-color)',
              border: '1px solid',
            }}
            onClick={onPrintChapter}
            title="طباعة الباب كاملاً"
            aria-label="طباعة الباب كاملاً"
          >
            <FiPrinter size={18} /> <span className="ms-1 d-none d-sm-inline">الباب كامل</span>
          </button>

          {/* التحكم في حجم الخط داخل القراءة */}
          <div
            className="d-flex align-items-center shadow-sm"
            role="group"
            aria-label="حجم الخط"
            style={{ backgroundColor: 'var(--badge-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}
          >
            <button
              className="btn btn-sm fw-bold px-2"
              style={{ color: 'var(--text-main)' }}
              onClick={() => setFontSize((p) => Math.max(p - 2, 14))}
              disabled={fontSize <= 14}
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              A−
            </button>
            <span className="px-1 small fw-bold" style={{ color: 'var(--text-muted)' }} aria-hidden="true">{fontSize}</span>
            <button
              className="btn btn-sm fw-bold px-2"
              style={{ color: 'var(--text-main)' }}
              onClick={() => setFontSize((p) => Math.min(p + 2, 24))}
              disabled={fontSize >= 24}
              title="تكبير الخط"
              aria-label="تكبير الخط"
            >
              A+
            </button>
          </div>

          <button
            className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
            onClick={onToggleBookmark}
            title="حفظ في المفضلة"
            aria-label={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
          >
            <FiBookmark size={24} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="reading-top-nav d-flex justify-content-between mb-4" aria-label="التنقل بين المسائل">
        <button
          className="btn nav-lesson-btn btn-sm d-flex align-items-center"
          onClick={onPrev}
          disabled={!canGoPrev}
        >
          <FiChevronRight className="ms-1" /> السابقة
        </button>
        <button
          className="btn nav-lesson-btn btn-sm d-flex align-items-center"
          onClick={onNext}
          disabled={!canGoNext}
        >
          التالية <FiChevronLeft className="me-1" />
        </button>
      </div>
    </>
  );
};
