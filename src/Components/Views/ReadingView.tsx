import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo,
  FiClock,
  FiFlag,
  FiBook,
  FiInfo,
  FiCheck,
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
import ArabesqueDivider from '../UI/ArabesqueDivider';
import ReadingProgressBar from '../UI/ReadingProgressBar';
import { useApp } from '../Layout/AppContext';
import type { Lesson } from '../../types';
import { getStopMarkForBook } from '../../features/stopMarks/model';
import { TextSelectionBubble, type SelectionPopupState } from './Reading/TextSelectionBubble';
import { ReadingHeaderBar } from './Reading/ReadingHeaderBar';
import { ReadingBottomNav } from './Reading/ReadingBottomNav';

// تقسيم المكوّنات الإضافية والتحميل المؤجل لتخفيف حزمة شاشة القراءة الأساسية
const FloatingTOC = lazy(() => import('../UI/FloatingTOC'));

// البوب-أب (حفظ كفائدة) لا يظهر إلا داخل نص المتن أو تعليق الشيخ
const BODY_TEXT_SELECTOR = '[data-selectable="body-text"]';

function isInsideBodyText(range: Range): boolean {
  const toElement = (node: Node): Element | null =>
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const ancestor = toElement(range.commonAncestorContainer);
  if (ancestor?.closest(BODY_TEXT_SELECTOR)) return true;
  const start = toElement(range.startContainer);
  const end = toElement(range.endContainer);
  return Boolean(start?.closest(BODY_TEXT_SELECTOR) || end?.closest(BODY_TEXT_SELECTOR));
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
  const prevLesson = canGoPrev ? lessons[currentIndex - 1] : undefined;
  const nextLesson = canGoNext ? lessons[currentIndex + 1] : undefined;
  const onToggleRead = (): void => { if (lesson) toggleReadLesson(lesson.id); };
  const onToggleBookmark = (): void => { if (lesson) toggleBookmark(lessonId); };
  const onToggleStopMark = (): void => {
    if (lesson) toggleStopMark(lesson);
  };
  const onSelectLesson = (selected: Lesson): void => {
    openLessonById(selected.id);
  };

  const handlePrintChapter = async (): Promise<void> => {
    if (!lesson) return;
    const chapterName = lesson.chapterName || 'بدون باب';
    const bookName = lesson.bookName || 'بدون كتاب';
    const chapterLessons = allLessons.filter(
      (l) => (l.chapterName || 'بدون باب') === chapterName && (l.bookName || 'بدون كتاب') === bookName,
    );
    const { exportChapterPrint } = await import('../../utils/printExport');
    exportChapterPrint({ chapterName, bookName, lessons: chapterLessons });
  };

  const [selectionPopup, setSelectionPopup] = useState<SelectionPopupState>({
    show: false,
    text: '',
    x: 0,
    y: 0,
    below: false,
  });

  const [highlightNotice, setHighlightNotice] = useState<string | null>(null);
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
      if (sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!isInsideBodyText(range)) {
        setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
        return;
      }

      let rect = range.getBoundingClientRect();
      if ((!rect || (rect.width === 0 && rect.height === 0)) && range.getClientRects().length > 0) {
        rect = range.getClientRects()[0];
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) return;

      // حساب أبعاد الشاشة والبوب-أب بدقة لمنع خروجه من الشاشة على الهواتف
      const isMobile = window.innerWidth <= 768;
      const screenW = typeof document !== 'undefined' && document.documentElement ? document.documentElement.clientWidth : window.innerWidth;
      const screenH = window.innerHeight;

      const popupWidth = isMobile ? 240 : 250;
      const popupHeight = 44;
      const marginX = 14;

      // منع خروج البوب-أب أفقياً من الشاشة (يساراً أو يميناً)
      const rawX = rect.left + rect.width / 2;
      const minX = popupWidth / 2 + marginX;
      const maxX = Math.max(minX, screenW - popupWidth / 2 - marginX);
      const clampedX = Math.max(minX, Math.min(maxX, rawX));

      // حساب المساحات الرأسية مع مراعاة شريط التنقل السفلي في الهواتف
      const bottomNavReserve = isMobile ? 80 : 24;
      const topReserve = 54;
      const maxAllowedY = Math.max(topReserve, screenH - bottomNavReserve - popupHeight);

      const spaceBelow = screenH - rect.bottom;
      const canFitBelow = spaceBelow >= (popupHeight + bottomNavReserve + 6);
      const canFitAbove = rect.top >= (popupHeight + topReserve + 6);

      let targetY: number;
      let placeBelow: boolean;

      if (isMobile) {
        // في الهواتف: تفضيل العرض أسفل النص إذا اتسعت المسافة قبل شريط التنقل، وإلا أعلاه
        if (canFitBelow) {
          targetY = rect.bottom + 8;
          placeBelow = true;
        } else if (canFitAbove) {
          targetY = rect.top - popupHeight - 8;
          placeBelow = false;
        } else {
          targetY = spaceBelow > rect.top ? rect.bottom + 6 : rect.top - popupHeight - 6;
          placeBelow = spaceBelow > rect.top;
        }
      } else {
        // في الشاشات الكبيرة: تفضيل العرض أعلى النص
        if (canFitAbove) {
          targetY = rect.top - popupHeight - 8;
          placeBelow = false;
        } else {
          targetY = rect.bottom + 8;
          placeBelow = true;
        }
      }

      const clampedY = Math.max(topReserve, Math.min(maxAllowedY, targetY));

      setSelectionPopup({
        show: true,
        text,
        x: clampedX,
        y: clampedY,
        below: placeBelow,
      });
    } catch {
      setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = (): void => {
      handleSelection();
    };

    const onMouseUp = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 20);
    };

    const onTouchEnd = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 60);
    };

    const onSelectionChange = (): void => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        if (timer) clearTimeout(timer);
        setSelectionPopup((prev) => (prev.show ? { ...prev, show: false } : prev));
      } else {
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, 140);
      }
    };

    const onScrollOrResize = (): void => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, 60);
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize);
    };
  }, [handleSelection]);

  const saveSelectionAsHighlight = (): void => {
    if (!selectionPopup.text || !lesson) return;
    const textToSave = selectionPopup.text;
    onCreateHighlight(textToSave);
    setSelectionPopup((prev) => ({ ...prev, show: false }));
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    // إشعار تأكيدي فوري ومرئي للمستخدم بنجاح الحفظ
    setHighlightNotice('تم حفظ الفائدة في قائمة فوائدك بنجاح ✨');
    setTimeout(() => setHighlightNotice(null), 3000);
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

    // إذا كان هناك نص محدد (أو جاري تحديده)، نمنع التنقل بالإيماءة فوراً لحماية التحديد
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      return;
    }

    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && canGoPrev) onPrev();
      else if (dx < 0 && canGoNext) onNext();
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonId]);

  // تتبع تمرير الصفحة لتثبيت اسم المسألة في الشريط العلوي عند التمرير
  const [isTitleScrolled, setIsTitleScrolled] = useState(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      const handleScroll = (): void => {
        setIsTitleScrolled(window.scrollY > 120);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTitleScrolled(!entry.isIntersecting && entry.boundingClientRect.top < 120);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '-70px 0px 0px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
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

      {/* بوب-أب حفظ كفائدة عند تحديد أي نص */}
      <TextSelectionBubble
        selectionPopup={selectionPopup}
        isSmallScreen={isSmallScreen}
        onSaveHighlight={saveSelectionAsHighlight}
      />

      {/* شريط التحكم العلوي المدمج — مثبت أعلى شاشة القراءة */}
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
        prevLessonTitle={prevLesson?.title}
        nextLessonTitle={nextLesson?.title}
        onOpenTOC={() => setIsTOCOpen((prev) => !prev)}
        lessonTitle={cleanedTitle}
        isScrolled={isTitleScrolled}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={lesson.id}
          initial={isSmallScreen ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={isSmallScreen ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {/* مسار التصفح الفقهي */}
          <Breadcrumb book={lesson.bookName} chapter={lesson.chapterName} />

          {/* اسم المسألة الرئيسي */}
          <h2
            ref={titleRef}
            className="h4 h3-md mb-2 mb-md-3 fw-bold mt-2 mt-md-4 text-center reading-lesson-title"
            style={{
              color: 'var(--primary-color)',
              wordBreak: 'normal',
              overflowWrap: 'break-word',
            }}
          >
            {cleanedTitle}
          </h2>

          {/* شارات وبيانات المسألة */}
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
            prevLessonTitle={prevLesson?.title}
            nextLessonTitle={nextLesson?.title}
          />
        </motion.div>
      </AnimatePresence>

      <Suspense fallback={null}>
        <FloatingTOC 
          currentLesson={lesson} 
          allLessons={allLessons} 
          onSelectLesson={onSelectLesson}
          isOpen={isTOCOpen}
          onToggle={setIsTOCOpen}
        />
      </Suspense>

      {/* إشعار تأكيدي عند حفظ فائدة بنجاح */}
      <AnimatePresence>
        {highlightNotice && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="position-fixed start-50 translate-middle-x shadow-lg"
            style={{
              bottom: '80px',
              zIndex: 9999,
              backgroundColor: 'var(--primary-color)',
              color: 'var(--text-on-primary)',
              padding: '10px 22px',
              borderRadius: '30px',
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            <FiCheck size={18} />
            <span>{highlightNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReadingView;
