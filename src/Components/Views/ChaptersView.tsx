import { FiBook, FiList, FiChevronLeft, FiFlag } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';
import { useApp } from '../Layout/AppContext';
import type { LessonIssue } from '../../types';

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

// ترقيم الأبواب بالحروف على طريقة كتب التراث
const ORDINALS = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن',
  'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر',
  'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
];
const ordinalOf = (n: number): string => (n >= 1 && n <= ORDINALS.length ? ORDINALS[n - 1] : `رقم ${n}`);

// شاشة أبواب الكتاب الواحد — صفحة كتاب شرعي: ترويسة مزخرفة + فهرس بالنقاط
const ChaptersView = () => {
  const {
    selectedBookName: bookName,
    selectedBookChapters: chapters,
    openChapterName,
    toggleChapter: onToggleChapter,
    openLessonById,
    contentSyncDone,
    stopMarks,
    lessons,
  } = useApp();
  const onSelectLesson = (lesson: LessonIssue): void => openLessonById(lesson.id);
  const stopLessonId = bookName ? stopMarks?.[bookName.trim()] : undefined;
  const stopLesson = stopLessonId
    ? lessons.find((l) => String(l.id) === String(stopLessonId))
    : undefined;
  return (
  <div className="mt-4">
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
      <FiList className="ms-2" /> {bookName} - الفصول
    </h3>

    {/* أكمل من علامة التوقف — نفس سلوك شاشة الكتب لكن داخل الكتاب */}
    {stopLesson && (
      <button
        className="btn btn-sm w-100 mb-3 d-flex align-items-center justify-content-center gap-1 shadow-sm"
        style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
        onClick={() => openLessonById(stopLesson.id)}
        title={stopLesson.title}
      >
        <FiFlag size={14} /> أكمل من هنا: {stopLesson.title.slice(0, 28)}
      </button>
    )}

    {chapters.length === 0 ? (
      !contentSyncDone ? (
        <div className="custom-card p-5 text-center shadow-sm">
          <div className="spinner-border mb-3" style={{ color: 'var(--primary-color)' }} role="status" aria-hidden="true" />
          <p className="text-muted mb-0 small">جارٍ تحميل مسائل الكتاب من السحابة...</p>
        </div>
      ) : (
        <EmptyState
          icon={FiBook}
          title="هذا الكتاب فارغ حالياً"
          message="لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد."
        />
      )
    ) : (
      <motion.div 
        className="d-flex flex-column gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {chapters.map(({ chapterName, issues }, chapterIndex) => {
          const isOpen = openChapterName === chapterName;

          return (
            <motion.div key={chapterName} variants={itemVariants} className="book-page" layout>
              <button
                className="chapter-band"
                onClick={() => onToggleChapter(chapterName)}
                aria-expanded={isOpen}
              >
                <span className="chapter-band-side">۞</span>
                <span className="chapter-band-center">
                  <span className="chapter-ordinal">الباب {ordinalOf(chapterIndex + 1)}</span>
                  <span className="chapter-band-name">{chapterName}</span>
                  <span className="chapter-band-count">{issues.length} مسائل</span>
                </span>
                <span className="chapter-band-side">۞</span>
                <span className="chapter-band-chevron">
                  <span className={`chapter-chevron-icon ${isOpen ? 'open' : ''}`}>
                    <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                  </span>
                </span>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className="px-3 pb-3 overflow-hidden"
                  >
                    {issues.map((lesson) => (
                      <LessonListItem
                        key={lesson.id}
                        variant="toc"
                        title={lesson.title}
                        pageNumber={lesson.pageNumber}
                        isRead={lesson.isRead}
                        isStopMark={String(lesson.id) === String(stopLessonId)}
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
};

export default ChaptersView;
