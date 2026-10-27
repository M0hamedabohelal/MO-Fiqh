import { memo } from 'react';
import { FiBook, FiFileText, FiList, FiPrinter, FiFlag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';
import { exportChapterPrint } from '../../utils/printExport';
import { useApp } from '../Layout/AppContext';
import type { LessonIssue } from '../../types';
import { getStopMarkForBook } from '../../features/stopMarks/model';

const REDUCE_LIST_ANIM =
  typeof window !== 'undefined' && window.innerWidth < 768;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: REDUCE_LIST_ANIM ? 0 : 0.05 } }
};

const itemVariants: Variants = REDUCE_LIST_ANIM
  ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
  : {
      hidden: { opacity: 0, x: 20 },
      show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

const LessonsView = memo(() => {
  const {
    selectedBookName: bookName,
    selectedBookChapters: chapters,
    openLessonById,
    lessons,
    stopMarks,
  } = useApp();
  const onSelectLesson = (lesson: LessonIssue): void => openLessonById(lesson.id);
  const stopMark = getStopMarkForBook(stopMarks, bookName, lessons);
  const stopLesson = stopMark?.lessonId
    ? lessons.find((lesson) => String(lesson.id) === stopMark.lessonId)
    : undefined;
  return (
  <div className="mt-4">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
        <FiFileText className="ms-2" /> فهرس المسائل
      </h3>
    </div>
    <div className="text-muted fw-bold mb-4">
      {bookName}
    </div>

    {stopMark && stopLesson && (
      <button
        type="button"
        className="btn btn-sm w-100 mb-3 d-flex align-items-center justify-content-center gap-1 shadow-sm"
        style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
        onClick={() => openLessonById(stopMark.lessonId!)}
        title={stopLesson.title}
      >
        <FiFlag size={14} /> أكمل من هنا: {stopLesson.title.slice(0, 28)}
      </button>
    )}

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
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn btn-sm d-flex align-items-center shadow-sm"
                style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
                onClick={() => exportChapterPrint({ chapterName, bookName: bookName ?? '', lessons: issues })}
                title="طباعة أو تصدير كـ PDF"
              >
                <FiPrinter className="ms-1" size={16} /> طباعة الباب
              </button>
            </div>
          </div>

          <motion.div 
            className="d-flex flex-column gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {issues.map((lesson) => (
              <motion.div key={lesson.id} variants={itemVariants} className="cv-auto-list-item">
                <LessonListItem
                  title={lesson.title}
                  pageNumber={lesson.pageNumber}
                  isRead={lesson.isRead}
                  isStopMark={lesson.id.toString() === stopMark?.lessonId}
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
});

export default LessonsView;
