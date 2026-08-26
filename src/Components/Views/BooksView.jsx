import { FiBook, FiCheckCircle, FiChevronLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';

// شاشة فهرس الكتب مع إحصاءات التقدم لكل كتاب
const BooksView = ({ books, onOpenBook }) => (
  <div className="mt-4">
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}><FiBook className="ms-2" /> فهرس الكتب</h3>
    <div className="row">
      {books.map(({ bookName, chaptersCount, issuesCount, readCount, progressPercent }) => (
        <div className="col-md-6 mb-3" key={bookName}>
          <button
            className="btn w-100 text-end p-4 shadow-sm list-btn"
            onClick={() => onOpenBook(bookName)}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span>{bookName}</span>
              <div className="d-flex align-items-center gap-3">
                {issuesCount > 0 && readCount === issuesCount && (
                  <FiCheckCircle size={18} className="lesson-read-badge" />
                )}
                <span className="text-muted small">
                  {chaptersCount > 0 ? `${chaptersCount} أبواب - ${issuesCount} مسائل` : 'فارغ'}
                </span>
                <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
              </div>
            </div>
            {issuesCount > 0 && (
              <div className="mt-3">
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <small className="text-muted d-block mt-1">
                  {progressPercent > 0
                    ? `✓ ختمت ${readCount} من ${issuesCount} مسائل (${progressPercent}%)`
                    : `لم تقرأ أي مسألة بعد — ${issuesCount} مسائل بانتظارك`}
                </small>
              </div>
            )}
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default BooksView;
