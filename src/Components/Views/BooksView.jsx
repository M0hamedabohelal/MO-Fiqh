import { FiBook, FiCheckCircle, FiStar } from 'react-icons/fi';
import { motion } from 'framer-motion';

// شاشة فهرس الكتب — كل كتاب بغلاف بصري + إحصاءات التقدم
const BooksView = ({ books, onOpenBook, newCount }) => (
  <div className="mt-4">
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}><FiBook className="ms-2" /> فهرس الكتب</h3>
    {newCount > 0 && (
      <div className="custom-card p-3 mb-4 d-flex align-items-center gap-2 shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
        <FiStar size={20} className="flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
        <span className="small fw-bold" style={{ color: 'var(--text-main)' }}>
          {newCount} {newCount === 1 ? 'مسألة جديدة' : newCount === 2 ? 'مسألتان جديدتان' : 'مسائل جديدة'} أُضيفت خلال آخر أسبوع
        </span>
      </div>
    )}
    <div className="row">
      {books.map(({ bookName, chaptersCount, issuesCount, readCount, progressPercent }) => (
        <div className="col-md-6 mb-3" key={bookName}>
          <button
            className="btn w-100 shadow-sm book-cover"
            onClick={() => onOpenBook(bookName)}
          >
            <span className="bk-corner bk-tl">✦</span>
            <span className="bk-corner bk-tr">✦</span>
            <span className="bk-corner bk-bl">✦</span>
            <span className="bk-corner bk-br">✦</span>
            {issuesCount > 0 && readCount === issuesCount && (
              <span className="bk-seal" title="كتاب مُتمم">
                <FiCheckCircle size={20} />
              </span>
            )}
            <span className="bk-cartouche">الباحث الفقهي</span>
            <span className="book-cover-title">{bookName}</span>
            <span className="bk-ornament">۞</span>
            <span className="book-cover-meta">
              {chaptersCount > 0 ? `${chaptersCount} أبواب • ${issuesCount} مسائل` : 'فارغ'}
            </span>
            {issuesCount > 0 && (
              <span className="bk-progress">
                <span className="progress-track book-cover-track">
                  <motion.span
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </span>
                <small className="book-cover-progress d-block mt-1">
                  {progressPercent > 0
                    ? `ختمت ${readCount} من ${issuesCount} مسائل (${progressPercent}%)`
                    : `لم تقرأ أي مسألة بعد — ${issuesCount} مسائل بانتظارك`}
                </small>
              </span>
            )}
            <span className="bk-foot">fqh.me</span>
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default BooksView;
