import { FiBook, FiList, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// شاشة أبواب الكتاب الواحد (أكورديون بكل باب ومسائله)
const ChaptersView = ({ bookName, chapters, openChapterName, onToggleChapter, onSelectLesson }) => (
  <div className="mt-4">
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
      <FiList className="ms-2" /> {bookName} - الفصول
    </h3>

    {chapters.length === 0 ? (
      <EmptyState
        icon={FiBook}
        title="هذا الكتاب فارغ حالياً"
        message="لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد."
      />
    ) : (
      <motion.div 
        className="d-flex flex-column gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {chapters.map(({ chapterName, issues }) => {
          const isOpen = openChapterName === chapterName;

          return (
            <motion.div key={chapterName} variants={itemVariants} className="custom-card shadow-sm overflow-hidden" layout>
              <button
                className="btn w-100 text-end p-4 d-flex justify-content-between align-items-center list-btn border-0"
                onClick={() => onToggleChapter(chapterName)}
                aria-expanded={isOpen}
              >
                <span>{chapterName}</span>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-muted small">{issues.length} مسائل</span>
                  {isOpen ? (
                    <FiChevronRight style={{ color: 'var(--accent-color)' }} />
                  ) : (
                    <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3"
                  >
                    {issues.map((lesson) => (
                      <LessonListItem
                        key={lesson.id}
                        title={lesson.title}
                        pageNumber={lesson.pageNumber}
                        isRead={lesson.isRead}
                        onClick={() => onSelectLesson(lesson)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    )}
  </div>
);

export default ChaptersView;
