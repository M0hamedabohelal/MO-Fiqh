import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { lessonsData } from '../data/lessons';

// ─── الروابط المباشرة: قراءة الرابط عند أول فتح (#/lesson/15 أو #/books ...) ───
function parseInitialRoute() {
  const lessonMatch = window.location.hash.match(/^#\/lesson\/(\d+)/);
  if (lessonMatch) {
    const idx = lessonsData.findIndex((l) => String(l.id) === lessonMatch[1]);
    if (idx !== -1) return { view: 'reading', index: idx };
  }
  const viewMatch = window.location.hash.match(/^#\/?(hero|books|chapters|lessons|bookmarks|highlights|admin)$/);
  if (viewMatch) return { view: viewMatch[1], index: 0 };
  return { view: 'hero', index: 0 };
}

// تحديث وسوم معاينة المشاركة (WhatsApp / Telegram / Facebook) حسب المسألة المعروضة
function updateSharePreview({ title, description }) {
  ['og:title', 'twitter:title'].forEach((prop) => {
    document.querySelector(`meta[property="${prop}"]`)?.setAttribute('content', title);
  });
  ['og:description', 'twitter:description', 'description'].forEach((prop) => {
    const el = document.querySelector(prop === 'description' ? 'meta[name="description"]' : `meta[property="${prop}"]`);
    el?.setAttribute('content', description);
  });
  // رابط المسألة المباشر في وسم og:url
  const ogUrl = document.querySelector('meta[property="og:url"]');
  ogUrl?.setAttribute('content', window.location.href);
}

/**
 * موجّه التطبيق بالروابط الهاشية: يدير الشاشة الحالية والمسألة المعروضة،
 * ويزامن الرابط وعنوان الصفحة ووسوم معاينة المشاركة مع كل تغيير.
 */
export function useHashRoute(lessons) {
  const initialRoute = useMemo(() => parseInitialRoute(), []);
  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [currentIndex, setCurrentIndex] = useState(initialRoute.index);

  // لحفظ التبويب الأخير الذي كان به قائمة (للرجوع إليه)
  const lastListView = useRef(['books', 'chapters', 'lessons', 'bookmarks', 'highlights', 'admin'].includes(initialRoute.view) ? initialRoute.view : 'books');

  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (['books', 'chapters', 'lessons', 'bookmarks', 'highlights', 'admin'].includes(currentView)) {
      lastListView.current = currentView;
    }
  }, [currentView]);

  const goToNextLesson = useCallback(() => {
    if (currentIndexRef.current < lessons.length - 1) {
      setCurrentIndex(currentIndexRef.current + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lessons.length]);

  const goToPrevLesson = useCallback(() => {
    if (currentIndexRef.current > 0) {
      setCurrentIndex(currentIndexRef.current - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // الروابط المباشرة: متابعة تغير الرابط (زر الرجوع أو لصق رابط مسألة)
  const applyHashNavigation = useCallback(() => {
    const lessonMatch = window.location.hash.match(/^#\/lesson\/(\d+)/);
    if (lessonMatch) {
      const idx = lessons.findIndex((l) => String(l.id) === lessonMatch[1]);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setCurrentView('reading');
        return;
      }
    }
    const viewMatch = window.location.hash.match(/^#\/?(hero|books|chapters|lessons|bookmarks|highlights|admin)$/);
    if (viewMatch) setCurrentView(viewMatch[1]);
  }, [lessons]);

  useEffect(() => {
    window.addEventListener('hashchange', applyHashNavigation);
    window.addEventListener('popstate', applyHashNavigation);
    return () => {
      window.removeEventListener('hashchange', applyHashNavigation);
      window.removeEventListener('popstate', applyHashNavigation);
    };
  }, [applyHashNavigation]);

  // مزامنة الرابط وعنوان الصفحة مع الشاشة الحالية (للمشاركة وSEO)
  useEffect(() => {
    const currentLesson = lessons[currentIndex];
    let hash = '#/';
    if (currentView === 'reading' && currentLesson?.id) {
      hash = `#/lesson/${currentLesson.id}`;
    } else if (['hero', 'books', 'chapters', 'lessons', 'bookmarks', 'highlights', 'admin'].includes(currentView)) {
      hash = `#/${currentView}`;
    }
    if (window.location.hash !== hash) {
      if (window.location.hash === '' || window.location.hash === '#/') {
        window.history.replaceState(null, '', hash);
      } else {
        window.history.pushState(null, '', hash);
      }
    } else {
      // If initialized directly on a subpage (e.g., refresh), insert hero into history so back button doesn't exit immediately
      if (hash !== '#/hero' && window.history.length <= 2) {
        window.history.replaceState(null, '', '#/hero');
        window.history.pushState(null, '', hash);
      }
    }

    // تحديث عنوان المتصفح ومعاينة المشاركة حسب المسألة المعروضة
    if (currentView === 'reading' && currentLesson?.title) {
      document.title = `${currentLesson.title} — الباحث الفقهي`;
      const snippet = (currentLesson.mainText || '').replace(/\s+/g, ' ').trim().slice(0, 150);
      updateSharePreview({
        title: `${currentLesson.title} — الباحث الفقهي`,
        description: snippet ? `${snippet}…` : 'منصة تعليمية متكاملة لدراسة الفقه الإسلامي',
      });
    } else {
      document.title = 'الباحث الفقهي';
      updateSharePreview({
        title: 'الباحث الفقهي — منصة تعليم الفقه الإسلامي',
        description: 'منصة تعليمية متكاملة لدراسة الفقه الإسلامي بأسلوب عصري ميسّر',
      });
    }
  }, [currentView, currentIndex, lessons]);

  const goBackToList = useCallback(() => {
    setCurrentView(lastListView.current);
  }, []);

  return {
    currentView,
    setCurrentView,
    currentIndex,
    setCurrentIndex,
    goToNextLesson,
    goToPrevLesson,
    goBackToList,
  };
}
