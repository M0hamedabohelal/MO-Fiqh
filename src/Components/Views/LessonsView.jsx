import { FiBook, FiFileText, FiList, FiPrinter } from 'react-icons/fi';
import { motion } from 'framer-motion';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';
import { exportChapterPrint } from '../../utils/printExport';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// شاشة فهرس المسائل الكامل للكتاب المختار (مجمعة حسب الأبواب)
const LessonsView = ({ bookName, chapters, onSelectLesson, newLessonIds }) => (
  <div className="mt-4">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
        <FiFileText className="ms-2" /> فهرس المسائل
      </h3>
    </div>
    <div className="text-muted fw-bold mb-4">
      {bookName}
    </div>
    <div className="d-flex flex-column gap-4">
      {chapters.length === 0 && (
        <EmptyState
          icon={FiBook}
          title="لا توجد مسائل حالياً"
          message="لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد."
        />
      )}

      {chapters.map(({ chapterName, issues }) => (
        <section key={chapterName}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5
              className="fw-bold mb-0 d-flex align-items-center"
              style={{ color: 'var(--primary-color)' }}
            >
              <FiList className="ms-2" /> {chapterName}
            </h5>
            <button
              className="btn btn-sm d-flex align-items-center shadow-sm"
              style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
              onClick={() => exportChapterPrint({ chapterName, bookName, lessons: issues })}
              title="طباعة أو تصدير كـ PDF"
            >
              <FiPrinter className="ms-1" size={16} /> طباعة الباب
            </button>
          </div>

          <motion.div 
            className="d-flex flex-column gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {issues.map((lesson) => (
              <motion.div key={lesson.id} variants={itemVariants}>
                <LessonListItem
                  title={lesson.title}
                  pageNumber={lesson.pageNumber}
                  isRead={lesson.isRead}
                  isNew={newLessonIds && newLessonIds.has(String(lesson.id))}
                  onClick={() => onSelectLesson(lesson)}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      ))}
    </div>
  </div>
);

export default LessonsView;
