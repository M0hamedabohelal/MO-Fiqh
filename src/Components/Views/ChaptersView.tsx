import { FiBook, FiList, FiChevronLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';
import type { ChapterGroup, LessonIssue } from '../../types';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
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
interface ChaptersViewProps {
  bookName: string;
  chapters: ChapterGroup[];
  openChapterName: string | null;
  onToggleChapter: (chapterName: string) => void;
  onSelectLesson: (lesson: LessonIssue) => void;
  newLessonIds?: Set<string>;
}

const ChaptersView = ({ bookName, chapters, openChapterName, onToggleChapter, onSelectLesson, newLessonIds }: ChaptersViewProps) => (
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
                        isNew={newLessonIds && newLessonIds.has(String(lesson.id))}
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
