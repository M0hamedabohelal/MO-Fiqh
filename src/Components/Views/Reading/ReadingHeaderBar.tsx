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
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onOpenTOC?: () => void;
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
}: ReadingHeaderBarProps) => {
  return (
    <div className="reading-header-toolbar d-flex justify-content-between align-items-center gap-2 mb-2 mb-md-3">
      {/* زر العودة لفهرس المسائل */}
      <div className="d-flex align-items-center">
        <button
          type="button"
          className="btn btn-sm text-muted d-flex align-items-center reading-back-btn p-1 p-md-2"
          aria-label="العودة لفهرس المسائل"
          title="العودة لفهرس المسائل"
          onClick={onBackToIndex}
        >
          <FiArrowRight size={20} className="ms-md-2" />
          <span className="d-none d-md-inline">العودة لفهرس المسائل</span>
        </button>
      </div>

      {/* أزرار أدوات القراءة الموحدة */}
      <div className="reading-actions d-flex align-items-center gap-1 gap-md-2 flex-nowrap">
        {/* 1. زر شجرة الفقه — يفتح فهرس المسائل مباشرة دون الحاجة لزر عائم فوق النص */}
        {onOpenTOC && (
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center shadow-sm p-1 px-2 reading-toolbar-btn"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              backgroundColor: 'var(--badge-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--primary-color)',
              border: '1px solid',
              minHeight: '38px',
            }}
            onClick={onOpenTOC}
            title="شجرة الفقه — مسائل الكتاب"
            aria-label="شجرة الفقه"
          >
            <FiList size={18} />
            <span className="ms-1 d-none d-lg-inline">شجرة الفقه</span>
          </button>
        )}

        {/* 2. زر طباعة الباب كاملاً — متاح دائماً على الهاتف والكمبيوتر */}
        <button
          type="button"
          className="btn btn-sm d-flex align-items-center shadow-sm p-1 px-2 reading-toolbar-btn"
          style={{
            borderRadius: '10px',
            fontWeight: 'bold',
            transition: 'all 0.3s',
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
          <FiPrinter size={18} />
          <span className="ms-1 d-none d-sm-inline">الباب كامل</span>
        </button>

        {/* 3. زر حالة القراءة */}
        <button
          type="button"
          className="btn btn-sm d-flex align-items-center shadow-sm p-1 px-2"
          style={{
            borderRadius: '10px',
            fontWeight: 'bold',
            transition: 'all 0.3s',
            backgroundColor: isRead ? '#27ae60' : 'var(--badge-bg)',
            borderColor: isRead ? '#27ae60' : 'var(--border-color)',
            color: isRead ? '#fff' : 'var(--text-main)',
            border: '1px solid',
            minHeight: '38px',
          }}
          onClick={onToggleRead}
          title={isRead ? 'إلغاء تعليم المسألة كمقروءة' : 'تعليم المسألة كمقروءة'}
          aria-label={isRead ? 'إلغاء تعليم المسألة كمقروءة' : 'تعليم المسألة كمقروءة'}
        >
          <FiCheckCircle size={16} className="ms-1" />
          <span className="d-none d-sm-inline">{isRead ? 'خلصتها' : 'خلصتها؟'}</span>
        </button>

        {/* 4. التحكم في حجم الخط داخل القراءة */}
        <div
          className="d-flex align-items-center shadow-sm"
          role="group"
          aria-label="حجم الخط"
          style={{
            backgroundColor: 'var(--badge-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            overflow: 'hidden',
            minHeight: '38px',
          }}
        >
          <button
            type="button"
            className="btn btn-sm fw-bold px-1 px-sm-2"
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
            type="button"
            className="btn btn-sm fw-bold px-1 px-sm-2"
            style={{ color: 'var(--text-main)' }}
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
          className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={onToggleBookmark}
          title="حفظ في المفضلة"
          aria-label={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
          style={{ minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <FiBookmark size={22} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
};
