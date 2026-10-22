import { memo } from 'react';
import { FiBook, FiCheckCircle, FiFlag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useApp } from '../Layout/AppContext';
import GuestAccountCard from '../UI/GuestAccountCard';
import { getStopMarkForBook } from '../../features/stopMarks/model';

// شاشة فهرس الكتب — كل كتاب بغلاف بصري + إحصاءات التقدم
const BooksView = memo(() => {
  const { booksWithStats: books, lessons, stopMarks, openBookChapters: onOpenBook, openLessonById, contentReady } = useApp();
  return (
  <div className="mt-4">
    <GuestAccountCard />
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}><FiBook className="ms-2" /> فهرس الكتب</h3>
    </div>
    <div className="row px-1">
      {books.map(({ bookName, issuesCount, readCount, progressPercent }) => {
        const stopMark = getStopMarkForBook(stopMarks, bookName, lessons);
        const stopLesson = stopMark?.lessonId
          ? lessons.find((lesson) => String(lesson.id) === stopMark.lessonId)
          : undefined;
        return (
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
                    {issuesCount > 0 ? `${issuesCount} مسألة` : (!contentReady ? 'جارٍ التحميل…' : 'قريباً')}
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
          {stopMark && stopLesson && (
            <button
              type="button"
              className="btn btn-sm w-100 mt-2 d-flex align-items-center justify-content-center gap-1 shadow-sm"
              style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.8rem' }}
              onClick={() => openLessonById(stopMark.lessonId!)}
              title={stopLesson.title}
            >
              <FiFlag size={14} /> أكمل: {stopLesson.title.slice(0, 28)}
            </button>
          )}
        </div>
        );
      })}
    </div>
  </div>
  );
});

export default BooksView;
