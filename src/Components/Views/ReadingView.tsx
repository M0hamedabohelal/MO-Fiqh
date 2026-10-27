import { useState, useCallback, useEffect, useRef } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo,
  FiClock,
  FiFlag,
  FiBook,
  FiInfo,
} from 'react-icons/fi';

import Breadcrumb from '../Header/Breadcrumb';
import QuoteCard from '../Content/QuoteCard';
import ExplanationCard from '../Content/ExplanationCard';
import VideoCard from '../Content/VideoCard';
import AudioCard from '../Content/AudioCard';
import NotesCard from '../Content/NotesCard';
import MediaCard from '../Content/MediaCard';
import ShareButton from '../UI/ShareButton';
import BismillahHeader from '../UI/BismillahHeader';
import { exportChapterPrint } from '../../utils/printExport';
import ArabesqueDivider from '../UI/ArabesqueDivider';
import FloatingTOC from '../UI/FloatingTOC';
import ReadingProgressBar from '../UI/ReadingProgressBar';
import QuoteImageModal from '../UI/QuoteImageModal';
import { useApp } from '../Layout/AppContext';
import type { Lesson } from '../../types';
import { getStopMarkForBook } from '../../features/stopMarks/model';
import { TextSelectionBubble, type SelectionPopupState } from './Reading/TextSelectionBubble';
import { ReadingHeaderBar } from './Reading/ReadingHeaderBar';
import { ReadingBottomNav } from './Reading/ReadingBottomNav';

interface QuoteImageState {
  show: boolean;
  text: string;
}

// البوب-أب (حفظ كفائدة / صورة) لا يظهر إلا داخل نص المتن أو تعليق الشيخ
const BODY_TEXT_SELECTOR = '[data-selectable="body-text"]';

function isInsideBodyText(range: Range): boolean {
  const toElement = (node: Node): Element | null =>
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const start = toElement(range.startContainer);
  const end = toElement(range.endContainer);
  return Boolean(start?.closest(BODY_TEXT_SELECTOR) && end?.closest(BODY_TEXT_SELECTOR));
}

// شاشة القراءة: نص المسألة + شرح الشيخ + الفيديو + الملاحظات والأدوات التفاعلية
const ReadingView = () => {
  const {
    currentLesson,
    lessons: allLessons,
    glossary,
    currentSearchQuery: searchQuery,
    notes,
    saveNoteForLesson: onSaveNote,
    readLessons,
    toggleReadLesson,
    bookmarks,
    toggleBookmark,
    stopMarks,
    toggleStopMark,
    currentIndex,
    lessons,
    goToPrevLesson: onPrev,
    goToNextLesson: onNext,
    goBackToList: onBackToIndex,
    openLessonById,
    createHighlightFromSelection: onCreateHighlight,
    fontSize,
    setFontSize,
  } = useApp();
  const lesson = currentLesson;
  const lessonId = lesson ? String(lesson.id) : '';
  const noteValue = lesson ? (notes[lessonId] || '') : '';
  const isRead = lesson ? readLessons.includes(lessonId) : false;
  const isBookmarked = lesson ? bookmarks.includes(lessonId) : false;
  const currentStopMark = lesson ? getStopMarkForBook(stopMarks, lesson.bookName, allLessons) : null;
  const isStopMarked = currentStopMark?.lessonId === lessonId;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < lessons.length - 1;
  const onToggleRead = (): void => { if (lesson) toggleReadLesson(lesson.id); };
  const onToggleBookmark = (): void => { if (lesson) toggleBookmark(lessonId); };
  const onToggleStopMark = (): void => {
    if (lesson) toggleStopMark(lesson);
  };
  const onSelectLesson = (selected: Lesson): void => {
    openLessonById(selected.id);
  };

  const handlePrintChapter = (): void => {
    if (!lesson) return;
    const chapterName = lesson.chapterName || 'بدون باب';
    const bookName = lesson.bookName || 'بدون كتاب';
    const chapterLessons = allLessons.filter(
      (l) => (l.chapterName || 'بدون باب') === chapterName && (l.bookName || 'بدون كتاب') === bookName,
    );
    exportChapterPrint({ chapterName, bookName, lessons: chapterLessons });
  };

  const [selectionPopup, setSelectionPopup] = useState<SelectionPopupState>({
    show: false,
    text: '',
    x: 0,
    y: 0,
    below: false,
  });

  const [quoteImage, setQuoteImage] = useState<QuoteImageState>({ show: false, text: '' });
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent): void => setIsSmallScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSelection = useCallback((): void => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 2) {
      setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      if (!isInsideBodyText(range)) {
        setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
        return;
      }
      const rect = range.getBoundingClientRect();
      const popupWidth = 140;
      const margin = 8;
      const rawX = rect.left + rect.width / 2;
      const clampedX = Math.max(
        popupWidth / 2 + margin,
        Math.min(window.innerWidth - popupWidth / 2 - margin, rawX),
      );
      const topY = rect.top - 46;
      const below = topY < 50;
      const clampedY = below ? rect.bottom + 8 : topY;

      setSelectionPopup({
        show: true,
        text,
        x: clampedX,
        y: clampedY,
        below,
      });
    } catch {
      setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
    }
  }, []);

  useEffect(() => {
    const onMouseUp = (): void => {
      setTimeout(handleSelection, 10);
    };
    const onSelectionChange = (): void => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
      }
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [handleSelection]);

  const saveSelectionAsHighlight = (): void => {
    if (!selectionPopup.text || !lesson) return;
    onCreateHighlight(selectionPopup.text);
    setSelectionPopup((prev) => ({ ...prev, show: false }));
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  };

  const openQuoteImage = (): void => {
    if (!selectionPopup.text || !lesson) return;
    setQuoteImage({ show: true, text: selectionPopup.text });
    setSelectionPopup((prev) => ({ ...prev, show: false }));
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  };

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>): void => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>): void => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && canGoPrev) onPrev();
      else if (dx < 0 && canGoNext) onNext();
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonId]);

  if (!lesson) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">لم يتم اختيار مسألة لعرضها.</p>
        <button type="button" className="btn btn-secondary mt-2" onClick={onBackToIndex}>
          العودة لفهرس المسائل
        </button>
      </div>
    );
  }

  // ضبط العنوان وتفادي نزول النقطتين أو علامات الترقيم في سطر بمفردها
  const cleanedTitle = (lesson.title || '').replace(/\s+([:،؛.؟!])/g, '$1');

  return (
    <div
      className="container reading-container py-2 py-md-4 px-2 px-md-3 position-relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '80vh' }}
    >
      <ReadingProgressBar />

      {/* بوب-أب حفظ كفائدة أو صورة عند تحديد أي نص */}
      <TextSelectionBubble
        selectionPopup={selectionPopup}
        isSmallScreen={isSmallScreen}
        onSaveHighlight={saveSelectionAsHighlight}
        onOpenQuoteImage={openQuoteImage}
      />

      {/* شريط التحكم العلوي المدمج */}
      <ReadingHeaderBar
        onBackToIndex={onBackToIndex}
        isRead={isRead}
        onToggleRead={onToggleRead}
        onPrintChapter={handlePrintChapter}
        fontSize={fontSize}
        setFontSize={setFontSize}
        isBookmarked={isBookmarked}
        onToggleBookmark={onToggleBookmark}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={onPrev}
        onNext={onNext}
        onOpenTOC={() => setIsTOCOpen((prev) => !prev)}
      />

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

          <h2
            className="h4 h3-md mb-2 mb-md-3 fw-bold mt-2 mt-md-4 text-center reading-lesson-title"
            style={{
              color: 'var(--primary-color)',
              wordBreak: 'normal',
              overflowWrap: 'break-word',
            }}
          >
            {cleanedTitle}
          </h2>

          <div className="reading-meta d-flex justify-content-center flex-wrap gap-2 gap-md-3 mb-3 mb-md-4">
            {String(lesson.pageNumber ?? '').trim() && (
              <span className="badge badge-custom d-flex align-items-center py-1 py-md-2 px-2 px-md-3 shadow-sm">
                <FiBook className="ms-1 ms-md-2" style={{ color: 'var(--accent-color)' }} /> ص {lesson.pageNumber}
              </span>
            )}
            {String(lesson.videoNumber ?? '').trim() && (
              <span className="badge badge-custom d-flex align-items-center py-1 py-md-2 px-2 px-md-3 shadow-sm">
                <FiVideo className="ms-1 ms-md-2" style={{ color: 'var(--accent-color)' }} /> {lesson.videoNumber}
              </span>
            )}
            {String(lesson.videoTimestamp ?? '').trim() && (
              <span className="badge badge-custom d-flex align-items-center py-1 py-md-2 px-2 px-md-3 shadow-sm">
                <FiClock className="ms-1 ms-md-2" style={{ color: 'var(--accent-color)' }} /> يبدأ عند: {lesson.videoTimestamp}
              </span>
            )}
            <button
              type="button"
              className="badge d-flex align-items-center py-1 py-md-2 px-2 px-md-3 shadow-sm border-0"
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s',
                backgroundColor: isStopMarked ? 'var(--primary-color)' : 'var(--badge-bg)',
                color: isStopMarked ? 'var(--text-on-primary)' : 'var(--text-main)',
              }}
              onClick={onToggleStopMark}
              aria-pressed={isStopMarked}
              title="حفظ أو إزالة علامة الوقوف لهذا الكتاب"
            >
              <FiFlag className="ms-1 ms-md-2" style={{ color: 'var(--accent-color)' }} />
              {isStopMarked ? 'علامة الوقوف محفوظة' : 'ضع علامة وقوف'}
            </button>
          </div>

          <BismillahHeader />
          {(lesson.adminNote || '').trim() && (
            <div className="custom-card p-3 p-md-4 mb-3 mb-md-4 d-flex gap-3 align-items-start shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
              <FiInfo className="mt-1 flex-shrink-0" size={24} style={{ color: 'var(--accent-color)' }} />
              <div>
                <h4 className="h6 fw-bold mb-2" style={{ color: 'var(--primary-color)', fontFamily: 'var(--font-heading)' }}>ملحوظة هامة:</h4>
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
            lessonId={lesson.id}
          />

          <ArabesqueDivider />

          {(lesson.sheikhExplanation || '').trim() && (
            <ExplanationCard explanation={lesson.sheikhExplanation || ''} searchQuery={searchQuery} glossary={glossary} />
          )}
          
          <MediaCard key={`media-${lessonId}`} mediaUrl={lesson.mediaUrl} mediaType={lesson.mediaType} title={lesson.title} />
          <AudioCard key={`audio-${lessonId}`} audioUrl={lesson.audioUrl} title={lesson.title} startTime={lesson.startTime} endTime={lesson.endTime} />
          <VideoCard key={`video-${lessonId}`} videoUrl={lesson.videoUrl} startTime={lesson.startTime} endTime={lesson.endTime} title={lesson.title} />

          {/* الميزات التفاعلية */}
          <NotesCard
            key={`notes-${lessonId}`}
            lessonId={lesson.id} 
            lessonTitle={lesson.title} 
            bookName={lesson.bookName}
            chapterName={lesson.chapterName}
            note={noteValue} 
            onSave={onSaveNote} 
          />

          {/* شريط التنقل السفلي */}
          <ReadingBottomNav
            currentIndex={currentIndex}
            totalLessons={lessons.length}
            pageNumber={lesson.pageNumber}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={onPrev}
            onNext={onNext}
          />
        </motion.div>
      </AnimatePresence>

      <FloatingTOC 
        currentLesson={lesson} 
        allLessons={allLessons} 
        onSelectLesson={onSelectLesson}
        isOpen={isTOCOpen}
        onToggle={setIsTOCOpen}
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
