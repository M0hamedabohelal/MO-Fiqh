import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { FiUser } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import HeroSection from './Components/Header/HeroSection';
import Slider from './Components/Sidebar/Slider';
import Topbar from './Components/Header/Topbar';

// نافذة البحث ونوافذ وأزرار الواجهة المشتركة
import SearchModal from './Components/UI/SearchModal';
import ShortcutsHelpModal from './Components/UI/ShortcutsHelpModal';
import BackToTopButton from './Components/UI/BackToTopButton';
import MobileBottomNav from './Components/Navigation/MobileBottomNav';
import PWABanners from './Components/UI/PWABanners';

// شاشات التطبيق
import BooksView from './Components/Views/BooksView';
import ChaptersView from './Components/Views/ChaptersView';
import LessonsView from './Components/Views/LessonsView';
import BookmarksView from './Components/Views/BookmarksView';
import HighlightsView from './Components/Views/HighlightsView';
import ReadingView from './Components/Views/ReadingView';
import SettingsView from './Components/Views/SettingsView';

// نظام الحسابات والسحابة
import { useAuth } from './Components/Auth/AuthContext';
import LoginModal from './Components/Auth/LoginModal';
// لوحة الإدارة تُحمّل عند الطلب فقط (تسريع التحميل للمستخدم العادي)
const AdminPanel = lazy(() => import('./Components/Admin/AdminPanel'));

// الـ hooks المستخرجة من التطبيق
import { useHashRoute } from './hooks/useHashRoute';
import { useUserLibrary } from './hooks/useUserLibrary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePWA } from './hooks/usePWA';

import { fetchLessons, fetchGlossary, trackLessonView } from './firebase/services';
import { isFirebaseConfigured } from './firebase/config';

import { BOOKS_LIST } from './data/books';
import { lessonsData } from './data/lessons';
import { glossaryData as staticGlossary } from './data/glossary';

function App() {
  // نظام الحسابات
  const { user, isAdminUser } = useAuth();

  // بيانات المحتوى: الداتا المحلية كأساس، والسحابة تُدمج فوقها عند التوفر
  const [rawLessons, setRawLessons] = useState(lessonsData);
  const [glossary, setGlossary] = useState(staticGlossary);
  const [cloudStatus, setCloudStatus] = useState(isFirebaseConfigured ? 'syncing' : 'local');

  const lessons = useMemo(() => {
    const ordinals = [
      { w: 'العشرون', v: 20 },
      { w: 'الحادية عشرة', v: 11 }, { w: 'الثانية عشرة', v: 12 }, { w: 'الثالثة عشرة', v: 13 }, { w: 'الرابعة عشرة', v: 14 }, { w: 'الخامسة عشرة', v: 15 },
      { w: 'السادسة عشرة', v: 16 }, { w: 'السابعة عشرة', v: 17 }, { w: 'الثامنة عشرة', v: 18 }, { w: 'التاسعة عشرة', v: 19 },
      { w: 'الحادي عشر', v: 11 }, { w: 'الثاني عشر', v: 12 }, { w: 'الثالث عشر', v: 13 }, { w: 'الرابع عشر', v: 14 }, { w: 'الخامس عشر', v: 15 },
      { w: 'السادس عشر', v: 16 }, { w: 'السابع عشر', v: 17 }, { w: 'الثامن عشر', v: 18 }, { w: 'التاسع عشر', v: 19 },
      { w: 'الأولى', v: 1 }, { w: 'الثانية', v: 2 }, { w: 'الثالثة', v: 3 }, { w: 'الرابعة', v: 4 }, { w: 'الخامسة', v: 5 },
      { w: 'السادسة', v: 6 }, { w: 'السابعة', v: 7 }, { w: 'الثامنة', v: 8 }, { w: 'التاسعة', v: 9 }, { w: 'العاشرة', v: 10 },
      { w: 'الأول', v: 1 }, { w: 'الثاني', v: 2 }, { w: 'الثالث', v: 3 }, { w: 'الرابع', v: 4 }, { w: 'الخامس', v: 5 },
      { w: 'السادس', v: 6 }, { w: 'السابع', v: 7 }, { w: 'الثامن', v: 8 }, { w: 'التاسع', v: 9 }, { w: 'العاشر', v: 10 }
    ];

    const getOrdinalVal = (text) => {
      if (!text) return 999;
      for (const o of ordinals) {
        if (text.includes(o.w)) return o.v;
      }
      return 999;
    };

    return [...rawLessons].sort((a, b) => {
      const bNameA = (a.bookName || '').trim();
      const bNameB = (b.bookName || '').trim();
      const bookA = BOOKS_LIST.indexOf(bNameA) === -1 ? 999 : BOOKS_LIST.indexOf(bNameA);
      const bookB = BOOKS_LIST.indexOf(bNameB) === -1 ? 999 : BOOKS_LIST.indexOf(bNameB);
      if (bookA !== bookB) return bookA - bookB;

      const chA = getOrdinalVal(a.chapterName);
      const chB = getOrdinalVal(b.chapterName);
      if (chA !== chB) return chA - chB;

      const issueA = getOrdinalVal(a.title);
      const issueB = getOrdinalVal(b.title);
      if (issueA !== issueB) return issueA - issueB;

      return a.id - b.id;
    });
  }, [rawLessons]);

  // المكتبة الشخصية (مفضلة/فوائد/ملاحظات/مقروء + مزامنة السحابة)
  const {
    bookmarks,
    highlights,
    notes,
    readLessons,
    toggleBookmark,
    addHighlight,
    deleteHighlight,
    saveNoteForLesson,
    toggleReadLesson,
    markLessonRead,
  } = useUserLibrary({ onStatus: setCloudStatus });

  // موجّه الروابط الهاشي
  const {
    currentView,
    setCurrentView,
    currentIndex,
    setCurrentIndex,
    goToNextLesson,
    goToPrevLesson,
  } = useHashRoute(lessons);
  const currentLesson = lessons[currentIndex];

  // UI States
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedBookName, setSelectedBookName] = useState('كتاب الطهارة');
  const [openChapterName, setOpenChapterName] = useState(null);
  const [lastReadLessonId, setLastReadLessonId] = useState(() => localStorage.getItem('lastReadLessonId') || null);

  // حالة التطبيق المثبت (PWA): التثبيت والتحديث والعمل أوفلاين
  const {
    canInstall,
    isInstalled,
    promptInstall,
    needRefresh,
    applyUpdate,
    offlineReady,
    dismissOfflineReady,
    isOffline,
  } = usePWA();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

  // جلب الداتا من السحابة عند بدء التطبيق (مع الاحتفاظ بالمحلية كاحتياط)
  const reloadFromCloud = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      const [cloudLessons, cloudGlossary] = await Promise.all([fetchLessons(), fetchGlossary()]);
      if (cloudLessons && cloudLessons.length > 0) {
        setRawLessons(cloudLessons);
      }
      if (cloudGlossary && Object.keys(cloudGlossary).length > 0) {
        setGlossary((prev) => ({ ...prev, ...cloudGlossary }));
      }
      setCloudStatus('synced');
    } catch {
      // فشل الاتصال — نكمل بالداتا المحلية المدمجة
      setCloudStatus('offline');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadFromCloud();
  }, [reloadFromCloud]);

  // ─── بيانات الفهرس المشتقة ───
  const chaptersWithIssues = useMemo(() => {
    const chaptersMap = new Map();

    lessons.forEach((lesson, index) => {
      if (!lesson.bookName || !lesson.chapterName) return;

      const bName = lesson.bookName.trim();
      const cName = lesson.chapterName.trim();
      const chapterKey = `${bName}__${cName}`;

      if (!chaptersMap.has(chapterKey)) {
        chaptersMap.set(chapterKey, {
          bookName: bName,
          chapterName: cName,
          issues: [],
        });
      }

      chaptersMap.get(chapterKey).issues.push({
        ...lesson,
        lessonIndex: index,
        isRead: readLessons.includes(String(lesson.id)),
      });
    });

    return Array.from(chaptersMap.values());
  }, [lessons, readLessons]);

  const booksWithStats = useMemo(() => (
    BOOKS_LIST.map((bookName) => {
      const chapters = chaptersWithIssues.filter((chapter) => chapter.bookName === bookName);
      const bookLessons = lessons.filter((l) => (l.bookName || '').trim() === bookName);
      const issuesCount = bookLessons.length;
      const readCount = bookLessons.filter((l) => readLessons.includes(String(l.id))).length;

      return {
        bookName,
        chaptersCount: chapters.length,
        issuesCount,
        readCount,
        progressPercent: issuesCount > 0 ? Math.round((readCount / issuesCount) * 100) : 0,
      };
    })
  ), [chaptersWithIssues, lessons, readLessons]);

  const selectedBookChapters = useMemo(
    () => chaptersWithIssues.filter((chapter) => chapter.bookName === selectedBookName),
    [chaptersWithIssues, selectedBookName]
  );

  // ─── معالجات التنقل ───
  const openBookChapters = (bookName) => {
    setSelectedBookName(bookName);
    setOpenChapterName(null);
    setCurrentView('chapters');
  };

  const toggleChapter = (chapterName) => {
    setOpenChapterName((prev) => (prev === chapterName ? null : chapterName));
  };

  // فتح مسألة بفهرسها في قائمة المسائل أو بمعرفها المباشر
  const openLessonByIndex = useCallback((index) => {
    setCurrentIndex(index);
    setCurrentView('reading');
  }, [setCurrentIndex, setCurrentView]);

  const openLessonById = useCallback((lessonId) => {
    const index = lessons.findIndex((l) => String(l.id) === String(lessonId));
    if (index !== -1) openLessonByIndex(index);
  }, [lessons, openLessonByIndex]);

  const handleSearchResultSelect = (selectedLesson, query) => {
    setCurrentSearchQuery(query || '');
    openLessonById(selectedLesson.id);
  };

  // حفظ التحديد الحالي كفائدة مقتبسة مرتبطة بالمسألة المعروضة
  const createHighlightFromSelection = useCallback((text) => {
    if (!currentLesson) return;
    addHighlight({
      id: Date.now(),
      lessonId: currentLesson.id,
      bookName: currentLesson.bookName,
      chapterName: currentLesson.chapterName,
      title: currentLesson.title,
      text,
    });
  }, [currentLesson, addHighlight]);

  // علامة الوقوف: مسألة واحدة محفوظة في localStorage للعودة إليها لاحقاً
  const toggleStopMark = () => {
    const id = currentLesson.id.toString();
    if (lastReadLessonId === id) {
      setLastReadLessonId(null);
      localStorage.removeItem('lastReadLessonId');
    } else {
      setLastReadLessonId(id);
      localStorage.setItem('lastReadLessonId', id);
    }
  };

  // تعليم المسألة كمقروءة تلقائياً + تسجيل مشاهدة عند فتحها في وضع القراءة
  useEffect(() => {
    if (currentView === 'reading' && currentLesson?.id) {
      markLessonRead(currentLesson.id);
      trackLessonView(currentLesson.id);
    }
  }, [currentView, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── اختصارات لوحة المفاتيح ───
  const handleKeyboardShortcut = useCallback((event) => {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.isContentEditable;
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      setIsSearchOpen(true);
      return;
    }

    if (key === '/' && !isTyping) {
      event.preventDefault();
      setIsSearchOpen(true);
      return;
    }

    if (key === '?' && !isTyping) {
      event.preventDefault();
      setShowShortcutsHelp((prev) => !prev);
      return;
    }

    if (isTyping) return;

    if (key === 'm') setCurrentView('bookmarks');
    if (key === 'h') setCurrentView('highlights');
    if (key === 'l') setCurrentView('lessons');

    if (currentView === 'reading' && currentLesson) {
      if (event.key === 'ArrowRight') goToPrevLesson();
      if (event.key === 'ArrowLeft') goToNextLesson();
      if (key === 'b') toggleBookmark(currentLesson.id);
      if (key === 's') setIsSearchOpen(true);
      if (key === 'f') {
        const selection = window.getSelection().toString().trim();
        if (selection.length > 5) createHighlightFromSelection(selection);
      }
    }
  }, [currentView, currentLesson, setCurrentView, goToPrevLesson, goToNextLesson, toggleBookmark, createHighlightFromSelection]);

  useKeyboardShortcuts(handleKeyboardShortcut);

  const lastReadTitle = lessons.find((l) => String(l.id) === lastReadLessonId)?.title;

  return (
    <div className="container-fluid p-0 position-relative">
      {/* نافذة البحث المنبثقة */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        data={lessons}
        onSelect={handleSearchResultSelect}
      />

      {/* نافذة تسجيل الدخول */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* دليل اختصارات لوحة المفاتيح */}
      <ShortcutsHelpModal open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

      {/* الشاشة الرئيسية الترحيبية */}
      {currentView === 'hero' ? (
        <HeroSection
          onStartBrowsing={() => setCurrentView('books')}
          lastReadTitle={lastReadTitle}
          onContinueReading={() => {
            if (lastReadLessonId) openLessonById(lastReadLessonId);
          }}
          onOpenLogin={() => setIsLoginOpen(true)}
          user={user}
        />
      ) : (
        <div className="row g-0">

          {/* الشريط الجانبي */}
          <div className="col-lg-2 col-md-3 d-none d-md-block sidebar-container">
            <Slider
              activeView={currentView}
              setActiveView={setCurrentView}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenLogin={() => setIsLoginOpen(true)}
              user={user}
              isAdminUser={isAdminUser}
              canInstall={canInstall}
              onInstall={promptInstall}
            />
          </div>

          <div className="col-lg-10 col-md-9 px-4 py-3 pb-5 pb-md-3">
            <Topbar
              setFontSize={setFontSize}
              theme={theme}
              toggleTheme={setTheme}
              cloudStatus={cloudStatus}
            />

            <div className="container mt-4" style={{ maxWidth: '850px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentView}-${currentIndex}`}
                  initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {/* 1. شاشة الكتب */}
                  {currentView === 'books' && (
                    <BooksView books={booksWithStats} onOpenBook={openBookChapters} />
                  )}

                  {/* 2. شاشة الفصول */}
                  {currentView === 'chapters' && (
                    <ChaptersView
                      bookName={selectedBookName}
                      chapters={selectedBookChapters}
                      openChapterName={openChapterName}
                      onToggleChapter={toggleChapter}
                      onSelectLesson={(lesson) => openLessonById(lesson.id)}
                    />
                  )}

                  {/* 3. شاشة المسائل */}
                  {currentView === 'lessons' && (
                    <LessonsView
                      bookName={selectedBookName}
                      chapters={selectedBookChapters}
                      onSelectLesson={(lesson) => openLessonById(lesson.id)}
                    />
                  )}

                  {/* شاشة المفضلة */}
                  {currentView === 'bookmarks' && (
                    <BookmarksView
                      bookmarks={bookmarks}
                      lessons={lessons}
                      onOpenLessonById={openLessonById}
                      onBrowse={() => setCurrentView('books')}
                    />
                  )}

                  {/* شاشة الفوائد المقتبسة */}
                  {currentView === 'highlights' && (
                    <HighlightsView
                      highlights={highlights}
                      notes={notes}
                      lessons={lessons}
                      onDeleteHighlight={deleteHighlight}
                      onOpenLessonById={openLessonById}
                    />
                  )}

                  {/* 4. شاشة القراءة */}
                  {currentView === 'reading' && currentLesson && (
                    <ReadingView
                      lesson={currentLesson}
                      glossary={glossary}
                      searchQuery={currentSearchQuery}
                      noteValue={notes[String(currentLesson.id)] || ''}
                      onSaveNote={saveNoteForLesson}
                      isRead={readLessons.includes(String(currentLesson.id))}
                      onToggleRead={() => toggleReadLesson(currentLesson.id)}
                      isBookmarked={bookmarks.includes(currentLesson.id)}
                      onToggleBookmark={() => toggleBookmark(currentLesson.id)}
                      canGoPrev={currentIndex > 0}
                      canGoNext={currentIndex < lessons.length - 1}
                      onPrev={goToPrevLesson}
                      onNext={goToNextLesson}
                      isStopMarked={lastReadLessonId === currentLesson.id.toString()}
                      onToggleStopMark={toggleStopMark}
                      onCreateHighlight={createHighlightFromSelection}
                      onBackToIndex={() => setCurrentView('lessons')}
                    />
                  )}

                  {/* 5. شاشة لوحة الإدارة — للمشرفين فقط */}
                  {currentView === 'admin' && (
                    isAdminUser ? (
                      <Suspense fallback={
                        <div className="text-center p-5">
                          <div className="spinner-border" style={{ color: 'var(--primary-color)' }} role="status" />
                          <p className="text-muted mt-3">جارٍ تحميل لوحة الإدارة...</p>
                        </div>
                      }>
                        <AdminPanel lessons={lessons} glossary={glossary} onDataChanged={reloadFromCloud} />
                      </Suspense>
                    ) : (
                      <div className="mt-4 mb-5">
                        <div className="custom-card p-5 text-center shadow-sm">
                          <FiUser size={48} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
                          <h5 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>هذه الصفحة للمشرفين فقط</h5>
                          <p className="text-muted mb-0">سجّل الدخول بحساب مشرف للوصول إلى لوحة الإدارة.</p>
                        </div>
                      </div>
                    )
                  )}

                  {/* 6. شاشة الإعدادات */}
                  {currentView === 'settings' && (
                    <SettingsView
                      canInstall={canInstall}
                      onInstall={promptInstall}
                      isInstalled={isInstalled}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* إشعارات التطبيق المثبت (PWA) */}
      <PWABanners
        isOffline={isOffline}
        needRefresh={needRefresh}
        applyUpdate={applyUpdate}
        offlineReady={offlineReady}
        dismissOfflineReady={dismissOfflineReady}
      />

      {/* زر العودة للأعلى */}
      <BackToTopButton />

      {/* لافتات PWA: أوفلاين + تحديث جاهز + جاهزية العمل بدون إنترنت */}
      <PWABanners
        isOffline={isOffline}
        needRefresh={needRefresh}
        applyUpdate={applyUpdate}
        offlineReady={offlineReady}
        dismissOfflineReady={dismissOfflineReady}
      />

      {/* شريط التنقل السفلي للموبايل */}
      {currentView !== 'hero' && (
        <MobileBottomNav
          currentView={currentView}
          user={user}
          isAdminUser={isAdminUser}
          onNavigate={setCurrentView}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
      )}
    </div>
  );
}

export default App;
