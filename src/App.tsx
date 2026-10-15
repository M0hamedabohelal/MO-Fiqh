import { useState, useEffect, useMemo, useCallback } from 'react';

import HeroSection    from './Components/Header/HeroSection';
import SearchModal    from './Components/UI/SearchModal';
import ShortcutsHelpModal from './Components/UI/ShortcutsHelpModal';
import MobileBottomNav from './Components/Navigation/MobileBottomNav';
import PWABanners     from './Components/UI/PWABanners';
import SplashScreen   from './Components/UI/SplashScreen';
import LoginModal     from './Components/Auth/LoginModal';
import AppLayout      from './Components/Layout/AppLayout';
import { AppProvider } from './Components/Layout/AppContext';
import type { AppContextValue } from './Components/Layout/AppContext';
import OnboardingSlides, { shouldShowOnboarding } from './Components/UI/OnboardingSlides';
import MindMapModal from './Components/UI/MindMapModal';

import { useAuth }             from './Components/Auth/AuthContext';
import { useHashRoute }        from './hooks/useHashRoute';
import { useUserLibrary }      from './hooks/useUserLibrary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePWA }              from './hooks/usePWA';
import { useAppData }          from './hooks/useAppData';

import { trackLessonView }     from './firebase/services';
import { BOOKS_LIST }          from './data/books';
import { safeGet, safeSet, safeRemove } from './utils/safeStorage';
import { useNewBadge }         from './hooks/useNewBadge';
import { useVisitTracking }    from './hooks/useVisitTracking';
import { useSplash }           from './hooks/useSplash';
import type { Lesson, ChapterGroup } from './types';

function App() {
  // ─── Auth ───
  const { user, isAdminUser, authLoading } = useAuth();

  // ─── PWA ───
  const { canInstall, isInstalled, promptInstall, needRefresh, applyUpdate, checkForUpdates, offlineReady, dismissOfflineReady, isOffline } = usePWA();

  // ─── بيانات المحتوى ───
  const { lessons, glossary, cloudStatus, setCloudStatus, reloadFromCloud } = useAppData({ isOffline });

  // ─── المكتبة الشخصية (تُزامن سحابيًا للمسجل — فتظهر علامات التوقف على كل الأجهزة) ───
  const { bookmarks, highlights, notes, readLessons, stopMarks, setStopMarks, toggleBookmark, addHighlight, deleteHighlight, saveNoteForLesson, toggleReadLesson, restoreLibrary } = useUserLibrary({ onStatus: setCloudStatus });

  // ─── التوجيه الهاشي ───
  const { currentView, setCurrentView, currentIndex, setCurrentIndex, selectedBookName, setSelectedBookName, openChapterName, setOpenChapterName, goToNextLesson, goToPrevLesson, goBackToList } = useHashRoute(lessons);
  const currentLesson = lessons[currentIndex];

  // ─── UI State ───
  const [fontSize, setFontSize]           = useState(() => {
    const saved = Number(safeGet('fontSize'));
    return Number.isFinite(saved) && saved >= 14 && saved <= 24 ? saved : 16;
  });
  const [theme, setTheme]                 = useState(() => {
    const saved = safeGet('theme');
    return (saved === 'sepia' || saved === 'dark') ? saved : 'dark';
  });
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [isLoginOpen, setIsLoginOpen]     = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp]   = useState(false);
  const [lastReadLessonId, setLastReadLessonId]       = useState(() => safeGet('lastReadLessonId'));
  const showSplash = useSplash(authLoading);
  const [mindmapOpen, setMindmapOpen]       = useState(false);
  // ✅ Onboarding: يظهر مرة واحدة بعد تسجيل الدخول لأول مرة
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Theme & Font
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeSet('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    safeSet('fontSize', String(fontSize));
  }, [fontSize]);

  // ترحيل لمرة واحدة: العلامة الواحدة القديمة للضيف → خريطة لكل كتاب (بعد تحميل الدروس لمعرفة الكتاب)
  useEffect(() => {
    if (user || Object.keys(stopMarks).length > 0 || lessons.length === 0) return;
    const oldId = safeGet('lastReadLessonId');
    if (!oldId) return;
    const lesson = lessons.find((l: Lesson) => String(l.id) === oldId);
    if (lesson?.bookName) {
      setStopMarks({ [lesson.bookName.trim()]: oldId });
    }
  }, [lessons, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // مزامنة lastReadLessonId مع علامات التوقف النشطة (لتحديث زر أكمل القراءة فوراً عبر الأجهزة)
  // ضبط متزامن مقصود مع حالة خارجية (السحابة عبر stopMarks) — يتوقف ذاتيًا خلال دورتين كحد أقصى
  useEffect(() => {
    const markIds = Object.values(stopMarks).filter(Boolean);
    if (markIds.length === 0) {
      if (lastReadLessonId && user) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLastReadLessonId(null);
        safeRemove('lastReadLessonId');
      }
      return;
    }
    if (!lastReadLessonId || !markIds.includes(lastReadLessonId)) {
      const latest = markIds[markIds.length - 1];
      setLastReadLessonId(latest);
      safeSet('lastReadLessonId', latest);
    }
  }, [stopMarks, lastReadLessonId, user]);

  // تنظيف: إسقاط علامات تشير لمسائل حُذفت (بعد تحميل الدروس فقط حتى لا نمسح الكل خطأً)
  useEffect(() => {
    if (lessons.length === 0 || Object.keys(stopMarks).length === 0) return;
    const validIds = new Set(lessons.map((l: Lesson) => String(l.id)));
    const pruned = Object.fromEntries(
      Object.entries(stopMarks).filter(([, id]) => validIds.has(String(id))),
    );
    if (Object.keys(pruned).length !== Object.keys(stopMarks).length) {
      setStopMarks(pruned);
    }
    // يُعاد عند وصول علامات السحابة متأخرةً أيضًا — يتوقف ذاتيًا عند عدم وجود فرق
  }, [lessons, stopMarks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── بيانات مشتقة للفهرس ───
  const chaptersWithIssues = useMemo(() => {
    const map = new Map<string, ChapterGroup>();
    lessons.forEach((lesson: Lesson, index: number) => {
      if (!lesson.bookName || !lesson.chapterName) return;
      const key = `${lesson.bookName.trim()}__${lesson.chapterName.trim()}`;
      let group = map.get(key);
      if (!group) {
        group = { bookName: lesson.bookName.trim(), chapterName: lesson.chapterName.trim(), issues: [] };
        map.set(key, group);
      }
      group.issues.push({ ...lesson, lessonIndex: index, isRead: readLessons.includes(String(lesson.id)) });
    });
    return Array.from(map.values());
  }, [lessons, readLessons]);

  const booksWithStats = useMemo(() => (
    BOOKS_LIST.map((bookName: string) => {
      const chapters    = chaptersWithIssues.filter((c) => c.bookName === bookName);
      const bookLessons = lessons.filter((l: Lesson) => (l.bookName || '').trim() === bookName);
      const readCount   = bookLessons.filter((l: Lesson) => readLessons.includes(String(l.id))).length;
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
  const openBookChapters = (bookName: string) => {
    setSelectedBookName(bookName);
    setOpenChapterName(null);
    setCurrentView('chapters');
  };

  const toggleChapter = (chapterName: string) =>
    setOpenChapterName((prev) => (prev === chapterName ? null : chapterName));

  const openLessonByIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setCurrentView('reading');
    window.scrollTo({ top: 0 });
  }, [setCurrentIndex, setCurrentView]);

  const openLessonById = useCallback((lessonId: string | number) => {
    const index = lessons.findIndex((l: Lesson) => String(l.id) === String(lessonId));
    if (index !== -1) openLessonByIndex(index);
  }, [lessons, openLessonByIndex]);

  const handleSearchResultSelect = (selectedLesson: Lesson, query: string) => {
    setCurrentSearchQuery(query || '');
    openLessonById(selectedLesson.id);
  };

  const createHighlightFromSelection = useCallback((text: string) => {
    if (!currentLesson) return;
    addHighlight({ id: Date.now(), lessonId: currentLesson.id, bookName: currentLesson.bookName, chapterName: currentLesson.chapterName, title: currentLesson.title, text });
  }, [currentLesson, addHighlight]);

  const toggleStopMark = () => {
    const id = currentLesson?.id?.toString();
    const book = (currentLesson?.bookName || '').trim();
    if (!id || !book) return;
    // إزالة إذا كانت هذه علامة الكتاب الحالية، وإلا تعيينها (لا تمس علامات الكتب الأخرى)
    if (stopMarks[book] === id) {
      setStopMarks((prev) => {
        const next = { ...prev };
        delete next[book];
        return next;
      });
      if (lastReadLessonId === id) {
        setLastReadLessonId(null);
        safeRemove('lastReadLessonId');
      }
    } else {
      setStopMarks((prev) => ({ ...prev, [book]: id }));
      setLastReadLessonId(id);
      safeSet('lastReadLessonId', id);
    }
  };

  // تسجيل مشاهدة المسألة
  const currentLessonId = currentLesson?.id;
  useEffect(() => {
    if (currentView === 'reading' && currentLessonId) trackLessonView(currentLessonId);
  }, [currentView, currentLessonId]);

  // التمرير لأعلى فورًا عند تغيير الشاشة (بدون smooth البطيء على الفون)
  useEffect(() => { window.scrollTo({ top: 0 }); }, [currentView, currentIndex]);

  // ─── اختصارات لوحة المفاتيح ───
  const handleKeyboardShortcut = useCallback((event: KeyboardEvent) => {
    const activeElement = document.activeElement as HTMLElement | null;
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
      if (key === 'f') { const sel = (window.getSelection()?.toString() ?? '').trim(); if (sel.length > 5) createHighlightFromSelection(sel); }
    }
  }, [currentView, currentLesson, setCurrentView, goToPrevLesson, goToNextLesson, toggleBookmark, createHighlightFromSelection]);

  useKeyboardShortcuts(handleKeyboardShortcut);

  // ─── التوجيه: التصفح مفتوح للجميع (القراءة عامة لأجل SEO)، والحساب للخصائص المحفوظة ───
  const lastReadTitle = lessons.find((l: Lesson) => String(l.id) === lastReadLessonId)?.title;

  useEffect(() => {
    if (authLoading) return;
    // ✅ Onboarding: بعد تسجيل الدخول نتحقق من أول مرة
    if (user && shouldShowOnboarding()) {
      // رفض ذاتي: عرض الشرائح يحدث مرة واحدة بعد الدخول — setState داخل التأثير مقصود هنا
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true);
    }
  }, [user, authLoading]);

  // ─── شارة "جديد" + سلسلة المواظبة: منطق مستخرج لخطافات مستقلة ───
  const { newLessonIds, newLessonsCount } = useNewBadge(lessons, readLessons);
  useVisitTracking(user, authLoading);

  // ─── تسريع التنقل: تحميل شاشات التطبيق مسبقًا عند الخمول ───
  useEffect(() => {
    const preload = () => {
      void import('./Components/Views/BooksView');
      void import('./Components/Views/ChaptersView');
      void import('./Components/Views/LessonsView');
      void import('./Components/Views/ReadingView');
      void import('./Components/Views/BookmarksView');
      void import('./Components/Views/HighlightsView');
      void import('./Components/Views/SettingsView');
    };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(preload, 2000);
    return () => clearTimeout(t);
  }, []);

  // لوحة الإدارة تُحمَّل مسبقًا للمشرفين فقط
  useEffect(() => {
    if (isAdminUser) void import('./Components/Admin/AdminPanel');
  }, [isAdminUser]);

  // قيمة السياق المشتركة — النوع الصارم يمنع نسيان أي حقل
  const layoutProps: AppContextValue = {
    currentView, currentIndex, currentLesson, lessons,
    user, isAdminUser,
    theme, setTheme, fontSize, setFontSize,
    cloudStatus,
    canInstall, isInstalled, promptInstall,
    needRefresh, applyUpdate, checkForUpdates,
    glossary, notes, bookmarks, highlights, readLessons,
    booksWithStats, selectedBookName, selectedBookChapters,
    openChapterName, lastReadLessonId, stopMarks, setStopMarks,
    setCurrentView, openBookChapters, toggleChapter,
    openMindMap: () => setMindmapOpen(true),
    openLessonById, goToNextLesson, goToPrevLesson, goBackToList,
    toggleBookmark, toggleReadLesson, saveNoteForLesson,
    deleteHighlight, createHighlightFromSelection,
    toggleStopMark, restoreLibrary,
    onOpenSearch: () => setIsSearchOpen(true),
    onOpenLogin: () => setIsLoginOpen(true),
    reloadFromCloud,
    currentSearchQuery,
    newLessonIds,
    newLessonsCount,
    lessonsCount: lessons.length,
  };

  return (
    <div className="container-fluid p-0 position-relative">
      <SplashScreen visible={showSplash} />

      {/* ✅ Onboarding — مرة واحدة للمستخدم الجديد */}
      {showOnboarding && <OnboardingSlides onDone={() => setShowOnboarding(false)} />}

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} data={lessons} onSelect={handleSearchResultSelect} />
      {mindmapOpen && (
        <MindMapModal
          open={mindmapOpen}
          onClose={() => setMindmapOpen(false)}
          books={booksWithStats}
          chapters={chaptersWithIssues}
          onSelectLesson={openLessonById}
        />
      )}
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
        <AppProvider value={layoutProps}>
          <AppLayout />
        </AppProvider>
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
