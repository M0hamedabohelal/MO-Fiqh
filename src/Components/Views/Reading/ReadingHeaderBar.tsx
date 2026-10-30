import React from 'react';
import {
  FiArrowRight,
  FiCheckCircle,
  FiPrinter,
  FiBookmark,
  FiList,
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
  onOpenTOC?: () => void;
  lessonTitle?: string;
  isScrolled?: boolean;
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
  onOpenTOC,
  lessonTitle,
  isScrolled,
}: ReadingHeaderBarProps) => {
  return (
    <div
      className={`reading-header-toolbar d-flex flex-column gap-1 mb-2 mb-md-3 ${isScrolled ? 'is-scrolled' : ''}`}
      role="region"
      aria-label="شريط أدوات القراءة"
    >
      {/* الصف الأول: أزرار التحكم مريحة وواسعة دون أي تزاحم */}
      <div className="d-flex justify-content-between align-items-center gap-2 w-100">
        {/* زر العودة لفهرس المسائل */}
        <div className="d-flex align-items-center flex-shrink-0">
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center reading-back-btn p-1 px-2 px-md-3 shadow-sm"
            aria-label="العودة لفهرس المسائل"
            title="العودة لفهرس المسائل"
            onClick={onBackToIndex}
            style={{
              backgroundColor: 'var(--badge-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
              border: '1px solid',
              borderRadius: '10px',
              minHeight: '38px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <FiArrowRight size={18} className="ms-md-2" />
            <span className="d-none d-md-inline">العودة للمسائل</span>
          </button>
        </div>

        {/* أزرار أدوات القراءة الموحدة */}
        <div className="reading-actions d-flex align-items-center gap-1 gap-md-2 flex-nowrap flex-shrink-0">
          {/* 1. زر شجرة الفقه */}
          {onOpenTOC && (
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center shadow-sm p-1 px-2 px-md-3 reading-toolbar-btn"
              style={{
                borderRadius: '10px',
                fontWeight: 'bold',
                backgroundColor: 'var(--badge-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--primary-color)',
                border: '1px solid',
                minHeight: '38px',
                transition: 'all 0.2s ease',
              }}
              onClick={onOpenTOC}
              title="شجرة الفقه — مسائل الكتاب"
              aria-label="شجرة الفقه"
            >
              <FiList size={17} />
              <span className="ms-1 d-none d-lg-inline">شجرة الفقه</span>
            </button>
          )}

          {/* 2. زر طباعة الباب كاملاً */}
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center shadow-sm p-1 px-2 px-md-3 reading-toolbar-btn"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              backgroundColor: 'var(--badge-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--primary-color)',
              border: '1px solid',
              minHeight: '38px',
            }}
            onClick={onPrintChapter}
            title="طباعة الباب كاملاً"
            aria-label="طباعة الباب كاملاً"
          >
            <FiPrinter size={17} />
            <span className="ms-1 d-none d-sm-inline">الباب كامل</span>
          </button>

          {/* 3. زر تأكيد إتمام قراءة المسألة */}
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center shadow-sm p-1 px-2 px-md-3 reading-toolbar-btn"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              backgroundColor: isRead ? 'rgba(39, 174, 96, 0.15)' : 'var(--badge-bg)',
              borderColor: isRead ? 'rgba(39, 174, 96, 0.5)' : 'var(--border-color)',
              color: isRead ? '#27ae60' : 'var(--primary-color)',
              border: '1px solid',
              minHeight: '38px',
            }}
            onClick={onToggleRead}
            title={isRead ? 'أتممت قراءة هذه المسألة (اضغط للإلغاء)' : 'تعليم المسألة كمقروءة'}
            aria-label={isRead ? 'إلغاء التعليم كمقروءة' : 'تعليم المسألة كمقروءة'}
          >
            <FiCheckCircle size={17} />
            <span className="ms-1 d-none d-sm-inline">{isRead ? 'أتممتها' : 'خلصتها؟'}</span>
          </button>

          {/* 4. مغير حجم الخط المدمج */}
          <div
            className="d-flex align-items-center shadow-sm p-1 font-size-ctrl-box"
            style={{
              backgroundColor: 'var(--badge-bg)',
              borderColor: 'var(--border-color)',
              borderRadius: '10px',
              border: '1px solid',
              minHeight: '38px',
            }}
          >
            <button
              type="button"
              className="btn btn-sm fw-bold px-2"
              style={{ color: 'var(--text-main)', minWidth: '32px' }}
              onClick={() => setFontSize((p) => Math.max(p - 2, 14))}
              disabled={fontSize <= 14}
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              A−
            </button>
            <span
              className="px-1 small fw-bold"
              style={{
                color: 'var(--primary-color)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: '22px',
                textAlign: 'center',
              }}
              aria-hidden="true"
            >
              {fontSize}
            </span>
            <button
              type="button"
              className="btn btn-sm fw-bold px-2"
              style={{ color: 'var(--text-main)', minWidth: '32px' }}
              onClick={() => setFontSize((p) => Math.min(p + 2, 24))}
              disabled={fontSize >= 24}
              title="تكبير الخط"
              aria-label="تكبير الخط"
            >
              A+
            </button>
          </div>

          {/* 5. زر المفضلة */}
          <button
            type="button"
            className={`bookmark-btn shadow-sm ${isBookmarked ? 'active' : ''}`}
            onClick={onToggleBookmark}
            title="حفظ في المفضلة"
            aria-label={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            style={{
              minHeight: '38px',
              minWidth: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: isBookmarked ? 'rgba(212, 175, 55, 0.5)' : 'var(--border-color)',
              backgroundColor: isBookmarked ? 'rgba(212, 175, 55, 0.12)' : 'var(--badge-bg)',
              color: isBookmarked ? '#d4af37' : 'var(--text-muted)',
              transition: 'all 0.25s ease',
            }}
          >
            <FiBookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* الصف الثاني: عنوان المسألة المثبت عند التمرير — بكامل عرض الشريط وبمظهر أندلسي راقٍ وواضح تماماً */}
      {lessonTitle && (
        <div
          className={`reading-sticky-title-band d-flex align-items-center justify-content-center gap-2 ${
            isScrolled ? 'opacity-100 mt-1 pt-2' : 'opacity-0'
          }`}
          style={{
            borderTop: isScrolled ? '1px solid var(--border-color)' : '1px solid transparent',
            cursor: isScrolled ? 'pointer' : 'default',
            userSelect: 'none',
            maxHeight: isScrolled ? '46px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.25s ease, opacity 0.25s ease, margin 0.25s ease, padding 0.25s ease, border-color 0.25s ease',
            pointerEvents: isScrolled ? 'auto' : 'none',
          }}
          onClick={() => {
            if (isScrolled) window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          title={isScrolled ? `${lessonTitle} (اضغط للصعود للأعلى)` : undefined}
          aria-hidden={!isScrolled}
        >
          <span style={{ color: 'var(--accent-color)', fontSize: '0.9rem', flexShrink: 0 }}>۞</span>
          <span
            className="reading-sticky-title text-truncate text-center"
            style={{
              color: 'var(--primary-color)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.01em',
              maxWidth: '92%',
            }}
          >
            {lessonTitle}
          </span>
          <span style={{ color: 'var(--accent-color)', fontSize: '0.9rem', flexShrink: 0 }}>۞</span>
        </div>
      )}
    </div>
  );
};
