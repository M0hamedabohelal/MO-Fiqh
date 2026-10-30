import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';

import HeroSection    from './Components/Header/HeroSection';
// Lazy loaded modals
const SearchModal = lazy(() => import('./Components/UI/SearchModal'));
const ShortcutsHelpModal = lazy(() => import('./Components/UI/ShortcutsHelpModal'));
import MobileBottomNav from './Components/Navigation/MobileBottomNav';
import SplashScreen   from './Components/UI/SplashScreen';
import UpdateBanner   from './Components/UI/UpdateBanner'
import { InstallPrompt } from './Components/UI/InstallPrompt'
import GuestLoginPrompt from './Components/UI/GuestLoginPrompt'
import { requireLogin, executePendingAction } from './utils/guestPrompt';
const LoginModal = lazy(() => import('./Components/Auth/LoginModal'));
import AppLayout      from './Components/Layout/AppLayout';
import { AppProvider } from './Components/Layout/AppContext';
import type { AppContextValue } from './Components/Layout/AppContext';
import { shouldShowOnboarding } from './utils/safeStorage';
const OnboardingSlides = lazy(() => import('./Components/UI/OnboardingSlides'));

import { useAuth }             from './Components/Auth/AuthContext';
import { useHashRoute }        from './hooks/useHashRoute';
import { useUserLibrary }      from './hooks/useUserLibrary';
import { useStopMarks }        from './hooks/useStopMarks';
import { useLibrarySync }      from './hooks/useLibrarySync';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOnlineStatus }     from './hooks/useOnlineStatus';
import { useAppData }          from './hooks/useAppData';
import { useAppVersion }       from './hooks/useAppVersion';

import { trackLessonView }     from './firebase/services';
import { BOOKS_LIST }          from './data/books';
import { safeGet, safeSet } from './utils/safeStorage';
import { createUniqueId } from './utils/uniqueId';
import { useVisitTracking }    from './hooks/useVisitTracking';
import { useSplash }           from './hooks/useSplash';
import type { Lesson, ChapterGroup, HighlightItem } from './types';
import { getLatestStopMark } from './features/stopMarks/model';
import type { StopMarkMap } from './features/stopMarks/model';

function App() {
  // ─── Auth ───
  const { user, isAdminUser, authLoading } = useAuth();

  // ─── حالة الشبكة وتأجيل اتصال السحابة على صفحة الهيرو ───
  const isOffline = useOnlineStatus();
  const [deferCloud, setDeferCloud] = useState(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hash;
    return !h || h === '#/' || h === '#/hero';
  });

  // رفع تأجيل السحابة بأول إشارة تفاعل أو تنقّل.
  // ⚠️ الموجّه (useHashRoute) يستخدم history.pushState وهو **لا يُطلق** hashchange، فمستمع
  // الحدث وحده لا يرى التنقل داخل التطبيق: كان المستخدم يضغط «تصفّح أبواب الفقه» فينتقل إلى
  // #/books ويبقى المحتوى غير محمّل (فهرس فارغ) — رُصد بالقياس على بناء المعاينة.
  // الحل: أي تفاعل (نقرة/لمسة/مفتاح) أو تغيّر مسار يرفع التأجيل فورًا قبل اكتمال التنقل،
  // فالحفظ يبدأ مبكرًا بخيط واحد ولا يعطّل أول رسم للهيرو. setState داخل مستمع حدث
  // (لا في جسم الأثر) فلا يخالف قاعدة react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!deferCloud) return undefined;
    const wake = () => setDeferCloud(false);
    const opts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener('hashchange', wake, opts);
    window.addEventListener('popstate', wake, opts);
    window.addEventListener('pointerdown', wake, opts);
    window.addEventListener('keydown', wake, opts);
    window.addEventListener('wheel', wake, opts);
    return () => {
      window.removeEventListener('hashchange', wake);
      window.removeEventListener('popstate', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('wheel', wake);
    };
  }, [deferCloud]);

  // ─── بيانات المحتوى ───
  const { lessons, glossary, cloudStatus, reloadFromCloud, reloadGlossary, cloudLessonsLoaded, contentReady, contentSource } = useAppData({ isOffline, deferCloud });
  const appVersion = useAppVersion();

  // ─── المكتبة الشخصية ───
  const { bookmarks, highlights, notes, readLessons, toggleBookmark, addHighlight, deleteHighlight, updateHighlightColor, saveNoteForLesson, toggleReadLesson, restoreLibrary, applyMergedLibrary, isDataLoaded } = useUserLibrary();
  const { stopMarks, stopMarksReady, toggleStopMark, restoreStopMarks, applyMergedStopMarks } = useStopMarks();

  // ─── التوجيه الهاشي ───
  const { currentView, setCurrentView, currentIndex, setCurrentIndex, selectedBookName, setSelectedBookName, openChapterName, setOpenChapterName, goToNextLesson, goToPrevLesson, goBackToList } = useHashRoute(lessons);
  const currentLesson = lessons[currentIndex];

  // ─── UI State ───
  const [fontSize, setFontSize]           = useState(() => {
    const saved = Number(safeGet('fontSize'));
    return Number.isFinite(saved) && saved >= 14 && saved <= 24 ? saved : 16;
  });
  const [theme, setTheme]                 = useState<'dark' | 'sepia' | 'light'>(() => {
    const saved = safeGet('theme');
    if (saved === 'sepia' || saved === 'dark' || saved === 'light') return saved;
    // احترام تفضيل نظام التشغيل (prefers-color-scheme) عند أول زيارة
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'dark';
  });
  // الثيم يُحفظ للجميع محليًا (لا يحتاج حسابًا للعرض)، لكن مزامنته بين الأجهزة
  // تتطلب حسابًا — لذلك نُطبّقه فورًا ونُظهر تنبيهًا إرشاديًا خفيفًا للزائر.
  const changeTheme = useCallback((next: 'dark' | 'sepia' | 'light') => {
    setTheme(next);
    if (!user?.uid) { requireLogin({ action: 'الثيم' }); }
  }, [user?.uid]);
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [isLoginOpen, setIsLoginOpen]     = useState(false);

  // ─── مزامنة المكتبة بين الأجهزة (لا تفعل شيئًا بلا حساب) ───
  // تُستدعى بعد تعريف theme والكتابات المحلية، وقبل أي استخدام للسياق.
  useLibrarySync({
    ready: isDataLoaded && stopMarksReady,
    data: { bookmarks, highlights, notes, readLessons, stopMarks, theme },
    onMerged: (merged) => {
      // تطبيق نتيجة الدمج محليًا بدفعة ذرية واحدة لمنع الرجات وتسريع الانعكاس بين الأجهزة
      applyMergedLibrary({
        bookmarks: merged.bookmarks,
        highlights: merged.highlights,
        notes: merged.notes,
        readLessons: merged.readLessons,
      });
      // ── علامات الوقف: تطبيق النتيجة المدمجة سحابيًا فورًا ──
      if (merged.stopMarks) {
        applyMergedStopMarks(merged.stopMarks);
      }
      // ── الثيم: تطبيق الأحدث ──
      if (merged.theme && (merged.theme === 'dark' || merged.theme === 'sepia' || merged.theme === 'light') && merged.theme !== theme) {
        setTheme(merged.theme as 'dark' | 'sepia' | 'light');
      }
    },
  });
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp]   = useState(false);
  // بوابة الشاشة تعتمد على اكتمال تحميل المحتوى فقط
  const { visible: showSplash, progress: splashProgress } = useSplash(authLoading, !contentReady);
  const splashStatus = authLoading
    ? 'جارٍ التحقق من الحساب...'
    : !contentReady
      ? 'جارٍ تحميل المسائل...'
      : cloudLessonsLoaded
        ? 'المسائل جاهزة من السحابة'
        : 'اكتمل تحميل المسائل المحلية';
  // ✅ Onboarding: يظهر مرة واحدة بعد تسجيل الدخول لأول مرة
  const [showOnboarding, setShowOnboarding] = useState(false);

  // بعد اكتمال تسجيل الدخول تماماً أو تبديل الحساب: العودة للشاشة الرئيسية (Hero) وإغلاق النافذة
  const isInitialAuthRef = useRef(true);
  const previousUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.uid ?? null;
    const previousUid = previousUidRef.current;

    if (isInitialAuthRef.current) {
      isInitialAuthRef.current = false;
      previousUidRef.current = uid;
      return;
    }

    if (uid === previousUid) return;
    previousUidRef.current = uid;
    if (uid) {
      // مزامنة واجهة مقصودة عند اكتمال تسجيل الدخول/تبديل الحساب (حدث مصادقة خارجي):
      // إغلاق نافذة الدخول والعودة للهيرو — ليس اشتقاقًا من الحالة بل استجابة لتغيّر المستخدم.
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setIsLoginOpen(false);
      setCurrentView('hero');
    }
  }, [user?.uid, authLoading, setCurrentView]);

  // Theme & Font
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeSet('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    safeSet('fontSize', String(fontSize));
  }, [fontSize]);

  // ─── بيانات مشتقة للفهرس ───
  const chaptersWithIssues = useMemo(() => {
    const map = new Map<string, ChapterGroup>();
    lessons.forEach((lesson: Lesson, index: number) => {
      if (!lesson.bookName || !lesson.chapterName) return;
      const cleanChapter = lesson.chapterName.replace(/\s*([،,:]\s*)/g, (_, p) => p.trim() + ' ').trim();
      const key = `${lesson.bookName.trim()}__${cleanChapter}`;
      let group = map.get(key);
      if (!group) {
        group = { bookName: lesson.bookName.trim(), chapterName: cleanChapter, issues: [] };
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

  const latestStopMark = useMemo(() => getLatestStopMark(stopMarks, lessons), [stopMarks, lessons]);
  const restoreFullLibrary = useCallback((data: {
    bookmarks?: string[]; highlights?: HighlightItem[]; notes?: Record<string, string>;
    readLessons?: string[]; stopMarks?: StopMarkMap;
  }) => {
    restoreLibrary(data);
    if (data.stopMarks) restoreStopMarks(data.stopMarks);
  }, [restoreLibrary, restoreStopMarks]);

  // ─── معالجات التنقل ───
  const openBookChapters = useCallback((bookName: string) => {
    setSelectedBookName(bookName);
    setOpenChapterName(null);
    setCurrentView('chapters');
  }, [setSelectedBookName, setOpenChapterName, setCurrentView]);

  const toggleChapter = useCallback((chapterName: string) =>
    setOpenChapterName((prev) => (prev === chapterName ? null : chapterName)),
  [setOpenChapterName]);

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
    addHighlight({ id: createUniqueId('hl'), lessonId: currentLesson.id, bookName: currentLesson.bookName, chapterName: currentLesson.chapterName, title: currentLesson.title, text });
  }, [currentLesson, addHighlight]);

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
  useEffect(() => {
    if (authLoading) return;
    // ✅ Onboarding: بعد تسجيل الدخول نتحقق من أول مرة
    if (user && shouldShowOnboarding()) {
      // رفض ذاتي: عرض الشرائح يحدث مرة واحدة بعد الدخول — setState داخل التأثير مقصود هنا
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true);
    }
  }, [user, authLoading]);

  // ─── سلسلة المواظبة: منطق مستخرج لخطاف مستقل ───
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
      // حزم Firebase (الأثقل ~118KB مضغوطًا) تُحمَّل وتُحلَّل مبكرًا عند الخمول،
      // فلا تنتظرها أول دخول — نفس المقاطع المعاد استخدامها لاحقًا بلا تحميل مكرر
      void import('firebase/firestore');
      void import('firebase/auth');
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

  // مراجع ثابتة للحالات المرتفعة حتى لا يُعاد بناء كائن السياق بلا داعٍ
  const onOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const onOpenLogin = useCallback(() => setIsLoginOpen(true), []);

  // قيمة السياق المشتركة — النوع الصارم يمنع نسيان أي حقل.
  // مُحسّنة بـ useMemo حتى لا يُعاد رسم كل مستهلكي useApp عند أي تغيّر لا يمسّهم.
  const layoutProps: AppContextValue = useMemo(() => ({
    currentView, currentIndex, currentLesson, lessons,
    user, isAdminUser,
    theme, setTheme: changeTheme, fontSize, setFontSize,
    cloudStatus, cloudLessonsLoaded, contentSource,
    contentReady,
    isOffline,
    glossary, notes, bookmarks, highlights, readLessons,
    stopMarks, stopMarksReady,
    booksWithStats, selectedBookName, selectedBookChapters,
    openChapterName,
    setCurrentView, openBookChapters, toggleChapter,
    openLessonById, goToNextLesson, goToPrevLesson, goBackToList,
    toggleBookmark, toggleReadLesson, toggleStopMark, saveNoteForLesson,
    deleteHighlight, updateHighlightColor, createHighlightFromSelection,
    restoreLibrary: restoreFullLibrary,
    onOpenSearch,
    onOpenLogin,
    reloadFromCloud,
    reloadGlossary,
    currentSearchQuery,
    lessonsCount: lessons.length,
    appVersion,
  }), [
    currentView, currentIndex, currentLesson, lessons,
    user, isAdminUser,
    theme, changeTheme, fontSize,
    cloudStatus, cloudLessonsLoaded, contentSource, contentReady,
    isOffline,
    glossary, notes, bookmarks, highlights, readLessons,
    stopMarks, stopMarksReady,
    booksWithStats, selectedBookName, selectedBookChapters,
    openChapterName,
    setCurrentView, openBookChapters, toggleChapter,
    openLessonById, goToNextLesson, goToPrevLesson, goBackToList,
    toggleBookmark, toggleReadLesson, toggleStopMark, saveNoteForLesson,
    deleteHighlight, updateHighlightColor, createHighlightFromSelection,
    restoreFullLibrary,
    onOpenSearch, onOpenLogin, reloadFromCloud, reloadGlossary,
    currentSearchQuery,
    appVersion,
  ]);

  return (
    <div className="container-fluid p-0 position-relative">
      <SplashScreen visible={showSplash} progress={splashProgress} statusText={splashStatus} />

      {/* إشعار نشر نسخة جديدة — عبر Service Worker مع استمرار الفحص الاحتياطي */}
      <UpdateBanner version={appVersion} />
      {/* دعوة تثبيت التطبيق PWA */}
      <InstallPrompt />
      {/* تحذير الزائر عند محاولة حفظ شيء يحتاج حسابًا */}
      <GuestLoginPrompt onOpenLogin={onOpenLogin} />

      {/* ✅ Onboarding — مرة واحدة للمستخدم الجديد */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingSlides onDone={() => setShowOnboarding(false)} />
        </Suspense>
      )}

      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} data={lessons} onSelect={handleSearchResultSelect} />
        </Suspense>
      )}
      {isLoginOpen && (
        <Suspense fallback={null}>
          <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSuccess={() => { executePendingAction(); setCurrentView('hero'); }} />
        </Suspense>
      )}
      {showShortcutsHelp && (
        <Suspense fallback={null}>
          <ShortcutsHelpModal open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
        </Suspense>
      )}

      {currentView === 'hero' ? (
        <HeroSection
          onStartBrowsing={() => setCurrentView('books')}
          stopLessonTitle={latestStopMark ? lessons.find((lesson) => String(lesson.id) === latestStopMark.lessonId)?.title : undefined}
          onContinueStopMark={() => { if (latestStopMark?.lessonId) openLessonById(latestStopMark.lessonId); }}
          onOpenLogin={() => setIsLoginOpen(true)}
          user={user}
        />
      ) : (
        <AppProvider value={layoutProps}>
          <AppLayout />
        </AppProvider>
      )}

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
