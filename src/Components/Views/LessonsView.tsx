import { memo, useState, useMemo } from 'react';
import { FiBook, FiFileText, FiList, FiPrinter, FiFlag, FiCheckCircle, FiClock, FiBookmark, FiLayers } from 'react-icons/fi';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import EmptyState from '../UI/EmptyState';
import LessonListItem from '../UI/LessonListItem';
import { exportChapterPrint } from '../../utils/printExport';
import { useApp } from '../Layout/AppContext';
import type { LessonIssue } from '../../types';
import { getStopMarkForBook } from '../../features/stopMarks/model';

type FilterType = 'all' | 'read' | 'unread' | 'bookmarks';

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
    bookmarks = [],
  } = useApp();

  const [filter, setFilter] = useState<FilterType>('all');

  const onSelectLesson = (lesson: LessonIssue): void => openLessonById(lesson.id);
  const stopMark = getStopMarkForBook(stopMarks, bookName, lessons);
  const stopLesson = stopMark?.lessonId
    ? lessons.find((lesson) => String(lesson.id) === stopMark.lessonId)
    : undefined;

  const bookmarkSet = useMemo(() => new Set((bookmarks || []).map(String)), [bookmarks]);

  const allIssues = useMemo(() => chapters.flatMap((c) => c.issues), [chapters]);

  const counts = useMemo(() => {
    const total = allIssues.length;
    let read = 0;
    let bookmarked = 0;
    for (const issue of allIssues) {
      if (issue.isRead) read++;
      if (bookmarkSet.has(String(issue.id))) bookmarked++;
    }
    return {
      all: total,
      read,
      unread: Math.max(0, total - read),
      bookmarks: bookmarked,
    };
  }, [allIssues, bookmarkSet]);

  const filteredChapters = useMemo(() => {
    if (filter === 'all') return chapters;
    return chapters
      .map((chapter) => ({
        ...chapter,
        issues: chapter.issues.filter((issue) => {
          if (filter === 'read') return Boolean(issue.isRead);
          if (filter === 'unread') return !issue.isRead;
          if (filter === 'bookmarks') return bookmarkSet.has(String(issue.id));
          return true;
        }),
      }))
      .filter((chapter) => chapter.issues.length > 0);
  }, [chapters, filter, bookmarkSet]);

  return (
  <div className="mt-4">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
        <FiFileText className="ms-2" /> فهرس المسائل
      </h3>
    </div>
    <div className="text-muted fw-bold mb-3">
      {bookName}
    </div>

    {/* أزرار التصفية السريعة */}
    <div className="d-flex align-items-center gap-2 mb-4 overflow-x-auto pb-1" role="group" aria-label="تصفية المسائل">
      <button
        type="button"
        className="btn btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-1"
        style={{
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '0.85rem',
          backgroundColor: filter === 'all' ? 'var(--primary-color)' : 'var(--badge-bg)',
          color: filter === 'all' ? '#ffffff' : 'var(--text-main)',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setFilter('all')}
        aria-pressed={filter === 'all'}
      >
        <FiLayers size={14} /> الكل ({counts.all})
      </button>
      <button
        type="button"
        className="btn btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-1"
        style={{
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '0.85rem',
          backgroundColor: filter === 'read' ? 'var(--primary-color)' : 'var(--badge-bg)',
          color: filter === 'read' ? '#ffffff' : 'var(--text-main)',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setFilter('read')}
        aria-pressed={filter === 'read'}
      >
        <FiCheckCircle size={14} /> المقروءة ({counts.read})
      </button>
      <button
        type="button"
        className="btn btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-1"
        style={{
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '0.85rem',
          backgroundColor: filter === 'unread' ? 'var(--primary-color)' : 'var(--badge-bg)',
          color: filter === 'unread' ? '#ffffff' : 'var(--text-main)',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setFilter('unread')}
        aria-pressed={filter === 'unread'}
      >
        <FiClock size={14} /> المتبقية ({counts.unread})
      </button>
      <button
        type="button"
        className="btn btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-1"
        style={{
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '0.85rem',
          backgroundColor: filter === 'bookmarks' ? 'var(--primary-color)' : 'var(--badge-bg)',
          color: filter === 'bookmarks' ? '#ffffff' : 'var(--text-main)',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setFilter('bookmarks')}
        aria-pressed={filter === 'bookmarks'}
      >
        <FiBookmark size={14} /> المفضلة ({counts.bookmarks})
      </button>
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

      {chapters.length > 0 && filteredChapters.length === 0 && (
        <EmptyState
          icon={FiBook}
          title="لا توجد مسائل مطابقة"
          message="لم نجد أي مسائل تطابق الفلتر المختار في هذا الكتاب."
        />
      )}

      {filteredChapters.map(({ chapterName, issues }) => (
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
