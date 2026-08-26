import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { lessonsData } from '../data/lessons';

// ─── الروابط المباشرة: قراءة الرابط عند أول فتح (#/lesson/15 أو #/books ...) ───
function parseInitialRoute() {
  const lessonMatch = window.location.hash.match(/^#\/lesson\/(\d+)/);
  if (lessonMatch) {
    const idx = lessonsData.findIndex((l) => String(l.id) === lessonMatch[1]);
    if (idx !== -1) return { view: 'reading', index: idx };
  }
  const viewMatch = window.location.hash.match(/^#\/(books|lessons|bookmarks|highlights)$/);
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

  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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
    const viewMatch = window.location.hash.match(/^#\/(books|lessons|bookmarks|highlights)$/);
    if (viewMatch) setCurrentView(viewMatch[1]);
  }, [lessons]);

  useEffect(() => {
    window.addEventListener('hashchange', applyHashNavigation);
    return () => window.removeEventListener('hashchange', applyHashNavigation);
  }, [applyHashNavigation]);

  // مزامنة الرابط وعنوان الصفحة مع الشاشة الحالية (للمشاركة وSEO)
  useEffect(() => {
    const currentLesson = lessons[currentIndex];
    let hash = '#/';
    if (currentView === 'reading' && currentLesson?.id) {
      hash = `#/lesson/${currentLesson.id}`;
    } else if (['books', 'lessons', 'bookmarks', 'highlights'].includes(currentView)) {
      hash = `#${currentView}`;
    }
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
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

  return {
    currentView,
    setCurrentView,
    currentIndex,
    setCurrentIndex,
    goToNextLesson,
    goToPrevLesson,
  };
}
