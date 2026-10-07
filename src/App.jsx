import { useState, useEffect, useMemo, useCallback } from 'react';

import HeroSection    from './Components/Header/HeroSection';
import SearchModal    from './Components/UI/SearchModal';
import ShortcutsHelpModal from './Components/UI/ShortcutsHelpModal';
import MobileBottomNav from './Components/Navigation/MobileBottomNav';
import PWABanners     from './Components/UI/PWABanners';
import SplashScreen   from './Components/UI/SplashScreen';
import LoginModal     from './Components/Auth/LoginModal';
import AppLayout      from './Components/Layout/AppLayout';
import OnboardingSlides, { shouldShowOnboarding } from './Components/UI/OnboardingSlides';

import { useAuth }             from './Components/Auth/AuthContext';
import { useHashRoute }        from './hooks/useHashRoute';
import { useUserLibrary }      from './hooks/useUserLibrary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePWA }              from './hooks/usePWA';
import { useAppData }          from './hooks/useAppData';

import { trackLessonView }     from './firebase/services';
import { BOOKS_LIST }          from './data/books';

function App() {
  // ─── Auth ───
  const { user, isAdminUser, authLoading } = useAuth();

  // ─── PWA ───
  const { canInstall, promptInstall, needRefresh, applyUpdate, offlineReady, dismissOfflineReady, isOffline } = usePWA();

  // ─── بيانات المحتوى ───
  const { lessons, glossary, cloudStatus, setCloudStatus, reloadFromCloud } = useAppData({ isOffline });

  // ─── المكتبة الشخصية ───
  const { bookmarks, highlights, notes, readLessons, toggleBookmark, addHighlight, deleteHighlight, saveNoteForLesson, toggleReadLesson } = useUserLibrary({ onStatus: setCloudStatus });

  // ─── التوجيه الهاشي ───
  const { currentView, setCurrentView, currentIndex, setCurrentIndex, selectedBookName, setSelectedBookName, openChapterName, setOpenChapterName, goToNextLesson, goToPrevLesson, goBackToList } = useHashRoute(lessons);
  const currentLesson = lessons[currentIndex];

  // ─── UI State ───
  const [fontSize, setFontSize]           = useState(16);
  const [theme, setTheme]                 = useState(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'sepia' || saved === 'dark') ? saved : 'dark';
  });
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [isLoginOpen, setIsLoginOpen]     = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp]   = useState(false);
  const [lastReadLessonId, setLastReadLessonId]       = useState(() => localStorage.getItem('lastReadLessonId') || null);
  const [showSplash, setShowSplash]       = useState(true);
  // ✅ Onboarding: يظهر مرة واحدة بعد تسجيل الدخول لأول مرة
  const [showOnboarding, setShowOnboarding] = useState(false);

  // شاشة التحميل
  useEffect(() => {
    const maxTimer = setTimeout(() => setShowSplash(false), 2000);
    if (!authLoading) {
      clearTimeout(maxTimer);
      const minTimer = setTimeout(() => setShowSplash(false), 600);
      return () => clearTimeout(minTimer);
    }
    return () => clearTimeout(maxTimer);
  }, [authLoading]);

  // Theme & Font
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

  // ─── بيانات مشتقة للفهرس ───
  const chaptersWithIssues = useMemo(() => {
    const map = new Map();
    lessons.forEach((lesson, index) => {
      if (!lesson.bookName || !lesson.chapterName) return;
      const key = `${lesson.bookName.trim()}__${lesson.chapterName.trim()}`;
      if (!map.has(key)) map.set(key, { bookName: lesson.bookName.trim(), chapterName: lesson.chapterName.trim(), issues: [] });
      map.get(key).issues.push({ ...lesson, lessonIndex: index, isRead: readLessons.includes(String(lesson.id)) });
    });
    return Array.from(map.values());
  }, [lessons, readLessons]);

  const booksWithStats = useMemo(() => (
    BOOKS_LIST.map((bookName) => {
      const chapters    = chaptersWithIssues.filter((c) => c.bookName === bookName);
      const bookLessons = lessons.filter((l) => (l.bookName || '').trim() === bookName);
      const readCount   = bookLessons.filter((l) => readLessons.includes(String(l.id))).length;
      return {
        bookName,
        chaptersCount: chapters.length,
        issuesCount: bookLessons.length,
        readCount,
        progressPercent: bookLessons.length > 0 ? Math.round((readCount / bookLessons.length) * 100) : 0,
      };
    })
  ), [chaptersWithIssues, lessons, readLessons]);

  const selectedBookChapters = useMemo(
    () => chaptersWithIssues.filter((c) => c.bookName === selectedBookName),
    [chaptersWithIssues, selectedBookName]
  );

  // ─── معالجات التنقل ───
  const openBookChapters = (bookName) => {
    setSelectedBookName(bookName);
    setOpenChapterName(null);
    setCurrentView('chapters');
  };

  const toggleChapter = (chapterName) =>
    setOpenChapterName((prev) => (prev === chapterName ? null : chapterName));

  const openLessonByIndex = useCallback((index) => {
    setCurrentIndex(index);
    setCurrentView('reading');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setCurrentIndex, setCurrentView]);

  const openLessonById = useCallback((lessonId) => {
    const index = lessons.findIndex((l) => String(l.id) === String(lessonId));
    if (index !== -1) openLessonByIndex(index);
  }, [lessons, openLessonByIndex]);

  const handleSearchResultSelect = (selectedLesson, query) => {
    setCurrentSearchQuery(query || '');
    openLessonById(selectedLesson.id);
  };

  const createHighlightFromSelection = useCallback((text) => {
    if (!currentLesson) return;
    addHighlight({ id: Date.now(), lessonId: currentLesson.id, bookName: currentLesson.bookName, chapterName: currentLesson.chapterName, title: currentLesson.title, text });
  }, [currentLesson, addHighlight]);

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

  // تسجيل مشاهدة المسألة
  useEffect(() => {
    if (currentView === 'reading' && currentLesson?.id) trackLessonView(currentLesson.id);
  }, [currentView, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // التمرير لأعلى عند تغيير الشاشة
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentView, currentIndex]);

  // ─── اختصارات لوحة المفاتيح ───
  const handleKeyboardShortcut = useCallback((event) => {
    const activeElement = document.activeElement;
    const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.isContentEditable;
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === 'k') { event.preventDefault(); setIsSearchOpen(true); return; }
    if (key === '/' && !isTyping) { event.preventDefault(); setIsSearchOpen(true); return; }
    if (key === '?' && !isTyping) { event.preventDefault(); setShowShortcutsHelp((p) => !p); return; }
    if (isTyping) return;

    if (key === 'm') setCurrentView('bookmarks');
    if (key === 'h') setCurrentView('highlights');
    if (key === 'l') setCurrentView('lessons');
    if (currentView === 'reading' && currentLesson) {
      if (event.key === 'ArrowRight') goToPrevLesson();
      if (event.key === 'ArrowLeft')  goToNextLesson();
      if (key === 'b') toggleBookmark(currentLesson.id);
      if (key === 's') setIsSearchOpen(true);
      if (key === 'f') { const sel = window.getSelection().toString().trim(); if (sel.length > 5) createHighlightFromSelection(sel); }
    }
  }, [currentView, currentLesson, setCurrentView, goToPrevLesson, goToNextLesson, toggleBookmark, createHighlightFromSelection]);

  useKeyboardShortcuts(handleKeyboardShortcut);

  // ─── التوجيه: التصفح مفتوح للجميع (القراءة عامة لأجل SEO)، والحساب للخصائص المحفوظة ───
  const lastReadTitle = lessons.find((l) => String(l.id) === lastReadLessonId)?.title;

  useEffect(() => {
    if (authLoading) return;
    // ✅ Onboarding: بعد تسجيل الدخول نتحقق من أول مرة
    if (user && shouldShowOnboarding()) {
      // رفض ذاتي: عرض الشرائح يحدث مرة واحدة بعد الدخول — setState داخل التأثير مقصود هنا
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true);
    }
  }, [user, authLoading]);

  // Props مشتركة للـ AppLayout
  const layoutProps = {
    currentView, currentIndex, currentLesson, lessons,
    user, isAdminUser,
    theme, setTheme, fontSize, setFontSize,
    cloudStatus,
    canInstall, promptInstall,
    glossary, notes, bookmarks, highlights, readLessons,
    booksWithStats, selectedBookName, selectedBookChapters,
    openChapterName, lastReadLessonId,
    setCurrentView, openBookChapters, toggleChapter,
    openLessonById, goToNextLesson, goToPrevLesson, goBackToList,
    toggleBookmark, toggleReadLesson, saveNoteForLesson,
    deleteHighlight, createHighlightFromSelection,
    toggleStopMark,
    onOpenSearch: () => setIsSearchOpen(true),
    onOpenLogin: () => setIsLoginOpen(true),
    reloadFromCloud,
    currentSearchQuery,
  };

  return (
    <div className="container-fluid p-0 position-relative">
      <SplashScreen visible={showSplash} />

      {/* ✅ Onboarding — مرة واحدة للمستخدم الجديد */}
      {showOnboarding && <OnboardingSlides onDone={() => setShowOnboarding(false)} />}

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} data={lessons} onSelect={handleSearchResultSelect} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSuccess={() => { if (currentView === 'hero') setCurrentView('books'); }} />
      <ShortcutsHelpModal open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

      {currentView === 'hero' ? (
        <HeroSection
          onStartBrowsing={() => setCurrentView('books')}
          lastReadTitle={lastReadTitle}
          onContinueReading={() => { if (lastReadLessonId) openLessonById(lastReadLessonId); }}
          onOpenLogin={() => setIsLoginOpen(true)}
          user={user}
        />
      ) : (
        <AppLayout {...layoutProps} />
      )}

      <PWABanners isOffline={isOffline} needRefresh={needRefresh} applyUpdate={applyUpdate} offlineReady={offlineReady} dismissOfflineReady={dismissOfflineReady} />

      {currentView !== 'hero' && (
        <MobileBottomNav
          currentView={currentView}
          user={user}
          isAdminUser={isAdminUser}
          onNavigate={setCurrentView}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}
    </div>
  );
}

export default App;
