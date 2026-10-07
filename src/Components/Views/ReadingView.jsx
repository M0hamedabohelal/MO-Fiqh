import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiBookmark,
  FiEdit3,
  FiFlag,
  FiCheckCircle,
  FiBook,
  FiArrowRight,
  FiInfo,
  FiPrinter,
  FiImage,
} from 'react-icons/fi';

import Breadcrumb from '../Header/Breadcrumb';
import QuoteCard from '../Content/QuoteCard';
import ExplanationCard from '../Content/ExplanationCard';
import VideoCard from '../Content/VideoCard';
import NotesCard from '../Content/NotesCard';
import MediaCard from '../Content/MediaCard';
import ShareButton from '../UI/ShareButton';
import BismillahHeader from '../UI/BismillahHeader';
import { exportChapterPrint } from '../../utils/printExport';
import ArabesqueDivider from '../UI/ArabesqueDivider';
import FloatingTOC from '../UI/FloatingTOC';
import ReadingProgressBar from '../UI/ReadingProgressBar';
import QuoteImageModal from '../UI/QuoteImageModal';

// شاشة القراءة: نص المسألة + شرح الشيخ + الفيديو + الملاحظات والأدوات التفاعلية
const ReadingView = ({
  lesson,
  allLessons,
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
  onSelectLesson,
}) => {
  // طباعة الباب كاملاً
  const handlePrintChapter = () => {
    const chapterLessons = allLessons.filter(l => l.chapterName === lesson.chapterName && l.bookName === lesson.bookName);
    exportChapterPrint({ chapterName: lesson.chapterName, bookName: lesson.bookName, lessons: chapterLessons });
  };

  // التقاط تحديد النص لحفظه كفائدة مقتبسة
  const [selectionPopup, setSelectionPopup] = useState({ show: false, text: '', x: 0, y: 0, below: false });
  const [quoteImage, setQuoteImage] = useState({ show: false, text: '' });

  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 5) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // تمركز أفقي مع منع الخروج من الشاشة (مهم للفون)
      const cx = rect.left + rect.width / 2;
      const halfPopup = 115;
      const x = Math.min(Math.max(cx, halfPopup + 8), window.innerWidth - halfPopup - 8);
      // لو التحديد قريب من أعلى الشاشة، اعرض البوب-أب تحته بدل فوقه
      let y = rect.top - 10;
      let below = false;
      if (rect.top < 100) {
        y = rect.bottom + 12;
        below = true;
      }
      setSelectionPopup({ show: true, text, x, y, below });
    } else {
      setSelectionPopup({ show: false, text: '', x: 0, y: 0, below: false });
    }
  }, []);

  const handleMouseUp = (e) => {
    if (quoteImage.show) return;
    // لا نفعل التحديد إذا كنا نضغط على زر
    if (e.target.closest('button')) return;
    captureSelection();
  };

  // مراجع السحب (فون)
  const touchStartRef = useRef({ x: 0, y: 0, t: 0 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }
  };

  const handleTouchEnd = (e) => {
    if (quoteImage.show) return;
    if (e.target.closest && e.target.closest('button')) return;
    // السحب الأفقي = تنقل بين المسائل (يمين/شمال)، مع تجاهل السحب العمودي والتحديد
    const changed = e.changedTouches && e.changedTouches[0];
    if (changed && e.changedTouches.length === 1) {
      const s = touchStartRef.current;
      const dx = changed.clientX - s.x;
      const dy = changed.clientY - s.y;
      const dt = Date.now() - s.t;
      const hasSelection = window.getSelection().toString().trim().length > 0;
      if (!hasSelection && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 600) {
        // RTL: السحب لليسار = المسألة التالية، لليمين = السابقة
        if (dx < 0 && canGoNext) { onNext(); return; }
        if (dx > 0 && canGoPrev) { onPrev(); return; }
      }
    }
    // نفس المنطق للمس في الموبايل مع مهلة قصيرة لاكتمال التحديد
    setTimeout(captureSelection, 100);
  };

  const saveSelectionAsHighlight = () => {
    if (!selectionPopup.text) return;
    onCreateHighlight(selectionPopup.text);
    window.getSelection().removeAllRanges();
    setSelectionPopup({ show: false, text: '', x: 0, y: 0, below: false });
  };

  const openQuoteImage = () => {
    if (!selectionPopup.text) return;
    setQuoteImage({ show: true, text: selectionPopup.text });
    window.getSelection().removeAllRanges();
    setSelectionPopup({ show: false, text: '', x: 0, y: 0, below: false });
  };

  // على الفون: أنيميشن دخول بسيط (opacity فقط) بدل حركة 3D الثقيلة على الـ GPU
  const isSmallScreen = useMemo(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
    [],
  );

  // عنوان لاصق يظهر عند السكرول لأسفل (فون فقط)
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setShowSticky(window.scrollY > 340);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div onMouseUp={handleMouseUp} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* عنوان لاصق أعلى الشاشة عند السكرول (فون فقط) */}
      <AnimatePresence>
        {showSticky && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0 })}
            title="العودة لأعلى"
            className="reading-sticky-title d-md-none"
          >
            {lesson.title}
          </motion.button>
        )}
      </AnimatePresence>
      {/* ✅ شريط تقدم القراءة */}
      <ReadingProgressBar />

      {/* زر حفظ التحديد كفائدة أو تحويله لبطاقة مصوّرة */}
      <AnimatePresence>
        {selectionPopup.show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="selection-popup"
            style={{
              position: 'fixed',
              top: selectionPopup.y,
              left: selectionPopup.x,
              transform: selectionPopup.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              zIndex: 9999,
              background: 'linear-gradient(135deg, #c9a84c 0%, #e6c875 50%, #c9a84c 100%)',
              color: '#1a1a1a',
              padding: '6px 8px',
              borderRadius: '50px',
              boxShadow: '0 6px 20px rgba(201, 168, 76, 0.55), 0 2px 8px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              maxWidth: 'calc(100vw - 16px)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-ui)',
              userSelect: 'none',
            }}
          >
            <button
              onClick={saveSelectionAsHighlight}
              title="حفظ النص المحدد كفائدة"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: 'none', color: 'inherit',
                fontWeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit',
                padding: '6px 12px', borderRadius: '50px', cursor: 'pointer',
              }}
            >
              <FiEdit3 size={16} /> حفظ كفائدة
            </button>
            <span style={{ width: '1px', height: '20px', background: 'rgba(26,26,26,0.25)' }} />
            <button
              onClick={openQuoteImage}
              title="تحويل النص المحدد إلى بطاقة مصوّرة"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: 'none', color: 'inherit',
                fontWeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit',
                padding: '6px 12px', borderRadius: '50px', cursor: 'pointer',
              }}
            >
              <FiImage size={16} /> صورة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <button
          className="btn btn-sm text-muted d-flex align-items-center"
          onClick={onBackToIndex}
        >
          <FiArrowRight className="ms-2" /> <span className="d-none d-md-inline">العودة لفهرس المسائل</span>
        </button>
        <div className="d-flex align-items-center gap-2 flex-wrap">

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
            <span className="d-none d-sm-inline">{isRead ? 'خلصتها' : 'خلصتها؟'}</span>
          </button>

          <button
            className="btn btn-sm d-flex align-items-center shadow-sm"
            style={{
              borderRadius: '10px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              backgroundColor: 'var(--badge-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--primary-color)',
              border: '1px solid',
            }}
            onClick={handlePrintChapter}
            title="طباعة الباب كاملاً"
          >
            <FiPrinter size={18} /> <span className="ms-1">الباب كامل</span>
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
          className="btn nav-lesson-btn btn-sm d-flex align-items-center"
          onClick={onPrev}
          disabled={!canGoPrev}
        >
          <FiChevronRight className="ms-1" /> السابقة
        </button>
        <button
          className="btn nav-lesson-btn btn-sm d-flex align-items-center"
          onClick={onNext}
          disabled={!canGoNext}
        >
          التالية <FiChevronLeft className="me-1" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={lesson.id}
          initial={isSmallScreen ? { opacity: 0 } : { opacity: 0, x: 50, rotateY: -10 }}
          animate={isSmallScreen ? { opacity: 1 } : { opacity: 1, x: 0, rotateY: 0 }}
          exit={isSmallScreen ? { opacity: 0 } : { opacity: 0, x: -50, rotateY: 10 }}
          transition={{ duration: isSmallScreen ? 0.15 : 0.22, ease: 'easeOut' }}
          style={isSmallScreen ? undefined : { perspective: '1000px' }}
        >
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
                color: isStopMarked ? 'var(--text-on-primary)' : 'var(--text-main)',
              }}
              onClick={onToggleStopMark}
              title="تحديد كعلامة توقف للعودة إليها لاحقاً"
            >
              <FiFlag className="ms-2" style={{ color: 'var(--accent-color)' }} />
              {isStopMarked ? 'علامة وقوفك الحالية' : 'ضع علامة وقوف'}
            </button>
          </div>

          <BismillahHeader />
          {(lesson.adminNote || '').trim() && (
            <div className="custom-card p-4 mb-4 d-flex gap-3 align-items-start shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
              <FiInfo className="mt-1 flex-shrink-0" size={24} style={{ color: 'var(--accent-color)' }} />
              <div>
                <h6 className="fw-bold mb-2" style={{ color: 'var(--primary-color)', fontFamily: 'var(--font-heading)' }}>ملحوظة هامة:</h6>
                <div className="mb-0" style={{ lineHeight: '1.9', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{lesson.adminNote}</div>
              </div>
            </div>
          )}
          
          {(lesson.mainText || '').trim() && (
            <QuoteCard text={lesson.mainText} searchQuery={searchQuery} glossary={glossary} />
          )}
          
          <ShareButton
            title={lesson.title}
            text={lesson.mainText}
            sheikhComment={lesson.sheikhExplanation}
          />

          <ArabesqueDivider />

          {(lesson.sheikhExplanation || '').trim() && (
            <ExplanationCard explanation={lesson.sheikhExplanation} searchQuery={searchQuery} glossary={glossary} />
          )}
          
          <MediaCard mediaUrl={lesson.mediaUrl} mediaType={lesson.mediaType} />
          <VideoCard videoUrl={lesson.videoUrl} startTime={lesson.startTime} endTime={lesson.endTime} />

          {/* الميزات التفاعلية */}
          <NotesCard 
            lessonId={lesson.id} 
            lessonTitle={lesson.title} 
            bookName={lesson.bookName}
            chapterName={lesson.chapterName}
            note={noteValue} 
            onSave={onSaveNote} 
          />
        </motion.div>
      </AnimatePresence>


      <FloatingTOC 
        currentLesson={lesson} 
        allLessons={allLessons} 
        onSelectLesson={onSelectLesson} 
      />

      {/* بطاقة الاقتباس المصوّرة من النص المحدد */}
      <QuoteImageModal
        show={quoteImage.show}
        text={quoteImage.text}
        source={`${lesson.bookName || ''} • ${lesson.title || ''}`}
        onClose={() => setQuoteImage({ show: false, text: '' })}
      />
    </div>
  );
};

export default ReadingView;
