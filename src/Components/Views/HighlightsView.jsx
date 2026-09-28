import { FiEdit3, FiTrash2, FiBook, FiChevronLeft, FiPrinter, FiCloud } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import ShareButton from '../UI/ShareButton';
import { exportNotesPrint } from '../../utils/printExport';
import { useAuth } from '../Auth/AuthContext';

// شاشة الفوائد المقتبسة + تصديرها مع الملاحظات
const HighlightsView = ({ highlights, notes, lessons, onDeleteHighlight, onOpenLessonById, onOpenLogin }) => {
  const { user } = useAuth();
  const hasAnySavedContent =
    highlights.length > 0 || Object.values(notes).some((t) => t && String(t).trim());

  return (
    <div className="mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
          <FiEdit3 className="ms-2" /> الفوائد المقتبسة
        </h3>
        <div className="d-flex gap-2">
          {!user && (
            <button onClick={onOpenLogin} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
              <FiCloud /> حفظ سحابي
            </button>
          )}
          {hasAnySavedContent && (
            <button
              className="btn btn-sm d-flex align-items-center shadow-sm"
              style={{
              backgroundColor: 'var(--badge-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              fontWeight: 'bold',
            }}
            onClick={() => exportNotesPrint({ highlights, notes, lessons })}
            title="طباعة أو حفظ PDF"
          >
            <FiPrinter className="ms-2" size={18} /> تصدير الفوائد والملاحظات
          </button>
        )}
      </div>
      </div>

      {!user && hasAnySavedContent && (
        <div className="alert alert-warning py-2 small d-flex align-items-center gap-2" role="alert">
          <FiCloud size={18} />
          <span>أنت تتصفح كضيف. <a href="#" onClick={(e) => { e.preventDefault(); onOpenLogin(); }} className="alert-link">سجّل الدخول</a> لحفظ فوائدك سحابياً.</span>
        </div>
      )}

      {highlights.length === 0 ? (
        <EmptyState
          icon={FiEdit3}
          title="لا توجد فوائد مقتبسة بعد"
          message="حدد أي نص في المسائل واضغط على زر الحفظ لإضافته هنا."
          hint="✨ جمّع أهم الفوائد العلمية في مكان واحد"
        />
      ) : (
        <div className="d-flex flex-column gap-3">
          {highlights.slice().reverse().map((highlight) => {
            const sourceLesson = lessons.find((l) => l.id === highlight.lessonId);
            const highlightBookName = highlight.bookName || sourceLesson?.bookName || 'كتاب غير محدد';
            const highlightChapterName = highlight.chapterName || sourceLesson?.chapterName || 'باب غير محدد';
            const highlightTitle = highlight.title || sourceLesson?.title || 'مسألة غير محددة';

            return (
              <div key={highlight.id} className="custom-card p-3 p-md-4 shadow-sm">
                {/* صف العنوان: النص + زر الحذف */}
                <div className="d-flex align-items-start gap-2 mb-3">
                  <p className="mb-0 flex-grow-1" style={{ fontSize: '1.1rem', lineHeight: '1.85' }}>
                    "{highlight.text}"
                  </p>
                  <button
                    className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '34px', height: '34px', minWidth: '34px', marginTop: '2px' }}
                    onClick={() => onDeleteHighlight(highlight.id)}
                    title="حذف الفائدة"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>

                <ShareButton title="فائدة مقتبسة" text={highlight.text} sheikhComment="" isSmall />
                <hr style={{ opacity: 0.1 }} />
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span className="badge badge-custom text-muted d-flex flex-column align-items-start py-2 px-3" style={{ maxWidth: '65%' }}>
                    <span className="text-truncate w-100"><FiBook className="ms-2" /> {highlightTitle}</span>
                    <small className="mt-1 text-truncate w-100">
                      {highlightBookName} &gt; {highlightChapterName}
                    </small>
                  </span>
                  <button
                    className="btn btn-sm btn-light text-primary d-flex align-items-center"
                    style={{ fontWeight: 'bold', flexShrink: 0 }}
                    onClick={() => onOpenLessonById(highlight.lessonId)}
                  >
                    الذهاب للمسألة <FiChevronLeft className="me-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HighlightsView;
