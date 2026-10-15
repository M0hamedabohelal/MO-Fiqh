import { memo } from 'react';
import { FiBook, FiCheckCircle, FiStar, FiGitBranch, FiFlag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useApp } from '../Layout/AppContext';

// شاشة فهرس الكتب — كل كتاب بغلاف بصري + إحصاءات التقدم
const BooksView = memo(() => {
  const { booksWithStats: books, lessons, newLessonsCount: newCount, openBookChapters: onOpenBook, openMindMap: onOpenMindMap, stopMarks, openLessonById } = useApp();
  const lessonTitle = (id: string | undefined): string | null => {
    if (!id) return null;
    const l = lessons.find((x) => String(x.id) === String(id));
    return l ? l.title : null;
  };
  return (
  <div className="mt-4">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}><FiBook className="ms-2" /> فهرس الكتب</h3>
      <button
        className="btn btn-sm d-flex align-items-center shadow-sm"
        style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
        onClick={onOpenMindMap}
        title="عرض خريطة الفقه الذهنية"
      >
        <FiGitBranch className="ms-1" size={16} /> الخريطة الذهنية
      </button>
    </div>
    {newCount > 0 && (
      <div className="custom-card p-3 mb-4 d-flex align-items-center gap-2 shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
        <FiStar size={20} className="flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
        <span className="small fw-bold" style={{ color: 'var(--text-main)' }}>
          {newCount} {newCount === 1 ? 'مسألة جديدة' : newCount === 2 ? 'مسألتان جديدتان' : 'مسائل جديدة'} أُضيفت خلال آخر أسبوع
        </span>
      </div>
    )}
    <div className="row px-1">
      {books.map(({ bookName, issuesCount, readCount, progressPercent }) => (
        <div className="col-6 col-md-4 mb-4 px-2" key={bookName}>
          <button
            className="btn w-100 p-0 book-item-btn shadow-sm"
            onClick={() => onOpenBook(bookName)}
          >            <div className="book-cover-graphic">
              {/* Ribbon at top right */}
              <div className="book-ribbon">
                <FiBook size={14} />
              </div>

              {/* Inner Arch Frame */}
              <div className="book-arch-frame">
                <div className="book-arch-inner">
                  <h4 className="book-top-title">الفقه الميسر</h4>
                  <div className="book-main-title">{bookName}</div>
                </div>
              </div>

              {issuesCount > 0 && readCount === issuesCount && (
                <span className="bk-seal" title="كتاب مُتمم">
                  <FiCheckCircle size={18} />
                </span>
              )}

              {/* معلومات الكتاب كطبقة فوق الغلاف — الغلاف يملأ البطاقة كاملة */}
              <div className="book-cover-overlay">
                <div className="book-meta-text" title={bookName}>
                  <span className="book-meta-text-title">{bookName}</span>
                  <span className="book-cover-count">
                    {issuesCount > 0 ? `${issuesCount} مسألة` : 'قريباً'}
                  </span>
                </div>
                {issuesCount > 0 && (
                  <div className="bk-progress mt-2">
                    <span className="progress-track book-cover-track">
                      <motion.span
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
          {/* أكمل من علامة التوقف الخاصة بهذا الكتاب */}
          {stopMarks?.[bookName.trim()] && lessonTitle(stopMarks[bookName.trim()]) && (
            <button
              className="btn btn-sm w-100 mt-2 d-flex align-items-center justify-content-center gap-1 shadow-sm"
              style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.8rem' }}
              onClick={() => openLessonById(stopMarks[bookName.trim()])}
              title={lessonTitle(stopMarks[bookName.trim()]) || 'أكمل القراءة'}
            >
              <FiFlag size={14} /> أكمل: {(lessonTitle(stopMarks[bookName.trim()]) || '').slice(0, 28)}
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
  );
});

export default BooksView;
