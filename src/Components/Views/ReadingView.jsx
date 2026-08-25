import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiBookmark,
  FiEdit3,
  FiFlag,
  FiCheckCircle,
  FiBook,
} from 'react-icons/fi';

import Breadcrumb from '../Header/Breadcrumb';
import QuoteCard from '../Content/QuoteCard';
import ExplanationCard from '../Content/ExplanationCard';
import VideoCard from '../Content/VideoCard';
import NotesCard from '../Content/NotesCard';
import ShareButton from '../UI/ShareButton';

// شاشة القراءة: نص المسألة + شرح الشيخ + الفيديو + الملاحظات والأدوات التفاعلية
const ReadingView = ({
  lesson,
  glossary,
  searchQuery,
  noteValue,
  onSaveNote,
  isRead,
  onToggleRead,
  isBookmarked,
  onToggleBookmark,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  isStopMarked,
  onToggleStopMark,
  onCreateHighlight,
  onBackToIndex,
}) => {
  // التقاط تحديد النص لحفظه كفائدة مقتبسة
  const [selectionPopup, setSelectionPopup] = useState({ show: false, text: '', x: 0, y: 0 });

  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 5) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopup({ show: true, text, x: rect.left + rect.width / 2, y: rect.top - 10 });
    } else {
      setSelectionPopup({ show: false, text: '', x: 0, y: 0 });
    }
  }, []);

  const handleMouseUp = (e) => {
    // لا نفعل التحديد إذا كنا نضغط على زر
    if (e.target.closest('button')) return;
    captureSelection();
  };

  const handleTouchEnd = () => {
    // نفس المنطق للمس في الموبايل مع مهلة قصيرة لاكتمال التحديد
    setTimeout(captureSelection, 100);
  };

  const saveSelectionAsHighlight = () => {
    if (!selectionPopup.text) return;
    onCreateHighlight(selectionPopup.text);
    window.getSelection().removeAllRanges();
    setSelectionPopup({ show: false, text: '', x: 0, y: 0 });
  };

  return (
    <div onMouseUp={handleMouseUp} onTouchEnd={handleTouchEnd}>
      {/* زر حفظ التحديد كفائدة */}
      <AnimatePresence>
        {selectionPopup.show && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed',
              top: selectionPopup.y,
              left: selectionPopup.x,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
              backgroundColor: 'var(--primary-color)',
              color: 'var(--accent-color)',
              padding: '8px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
            onClick={saveSelectionAsHighlight}
          >
            <FiEdit3 size={18} /> حفظ كفائدة
          </motion.div>
        )}
      </AnimatePresence>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-sm text-muted d-flex align-items-center"
          onClick={onBackToIndex}
        >
          <FiList className="ms-2" /> العودة لفهرس المسائل
        </button>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm d-flex align-items-center shadow-sm"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              backgroundColor: isRead ? '#27ae60' : 'var(--badge-bg)',
              borderColor: isRead ? '#27ae60' : 'var(--border-color)',
              color: isRead ? '#fff' : 'var(--text-main)',
              border: '1px solid',
            }}
            onClick={onToggleRead}
            title={isRead ? 'إلغاء تعليم المسألة كمقروءة' : 'تعليم المسألة كمقروءة'}
          >
            <FiCheckCircle size={16} className="ms-1" />
            {isRead ? 'خلصتها' : 'خلصتها؟'}
          </button>
          <button
            className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
            onClick={onToggleBookmark}
            title="حفظ في المفضلة"
          >
            <FiBookmark size={24} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="d-flex justify-content-between mb-4">
        <button
          className="btn btn-outline-primary btn-sm d-flex align-items-center"
          onClick={onPrev}
          disabled={!canGoPrev}
        >
          <FiChevronRight className="ms-1" /> السابقة
        </button>
        <button
          className="btn btn-outline-primary btn-sm d-flex align-items-center"
          onClick={onNext}
          disabled={!canGoNext}
        >
          التالية <FiChevronLeft className="me-1" />
        </button>
      </div>

      <Breadcrumb book={lesson.bookName} chapter={lesson.chapterName} />

      <h3 className="mb-3 fw-bold mt-4 text-center" style={{ color: 'var(--primary-color)' }}>
        {lesson.title}
      </h3>

      <div className="d-flex justify-content-center flex-wrap gap-3 mb-4">
        <span className="badge badge-custom d-flex align-items-center py-2 px-3 shadow-sm">
          <FiBook className="ms-2" style={{ color: 'var(--accent-color)' }} /> ص {lesson.pageNumber}
        </span>
        <span className="badge badge-custom d-flex align-items-center py-2 px-3 shadow-sm">
          <FiVideo className="ms-2" style={{ color: 'var(--accent-color)' }} /> {lesson.videoNumber}
        </span>
        <span className="badge badge-custom d-flex align-items-center py-2 px-3 shadow-sm">
          <FiClock className="ms-2" style={{ color: 'var(--accent-color)' }} /> يبدأ عند: {lesson.videoTimestamp}
        </span>
        <button
          className="badge d-flex align-items-center py-2 px-3 shadow-sm border-0"
          style={{
            cursor: 'pointer',
            transition: 'all 0.3s',
            backgroundColor: isStopMarked ? 'var(--primary-color)' : 'var(--badge-bg)',
            color: isStopMarked ? 'var(--accent-color)' : 'var(--text-main)',
          }}
          onClick={onToggleStopMark}
          title="تحديد كعلامة توقف للعودة إليها لاحقاً"
        >
          <FiFlag className="ms-2" style={{ color: 'var(--accent-color)' }} />
          {isStopMarked ? 'علامة وقوفك الحالية' : 'ضع علامة وقوف'}
        </button>
      </div>

      <QuoteCard text={lesson.mainText} searchQuery={searchQuery} glossary={glossary} />

      <ShareButton
        title={lesson.title}
        text={lesson.mainText}
        sheikhComment={lesson.sheikhExplanation}
      />

      <ExplanationCard explanation={lesson.sheikhExplanation} searchQuery={searchQuery} />
      <VideoCard videoUrl={lesson.videoUrl} startTime={lesson.startTime} />

      {/* الميزات التفاعلية */}
      <NotesCard lessonId={lesson.id} lessonTitle={lesson.title} note={noteValue} onSave={onSaveNote} />
    </div>
  );
};

export default ReadingView;
