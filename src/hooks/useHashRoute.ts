import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Lesson } from "../types";

// ─── الروابط المباشرة: قراءة الرابط عند أول فتح (#/lesson/15 أو #/book/... أو #/books ...) ───

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function encode(s: string): string {
  return encodeURIComponent(s);
}

interface RouteState {
  view: string;
  index: number;
  lessonId: string | null;
  bookName: string | null;
  chapterName: string | null;
}

// إعادة بناء حالة التنقل كاملةً من الرابط الهاشي الحالي
// الأشكال المدعومة:
//   #/lesson/{id}
//   #/book/{bookName}                          → شاشة الأبواب لكتاب معين
//   #/book/{bookName}/chapter/{chapterName}    → شاشة الأبواب مع فتح باب معين
//   #/hero | #/books | #/lessons | #/bookmarks | #/highlights | #/achievements | #/admin
function parseRoute(hash: string, lessons: Lesson[]): RouteState {
  const lessonMatch = hash.match(/^#\/lesson\/(\d+)/);
  if (lessonMatch) {
    const id = lessonMatch[1];
    const idx = lessons.findIndex((l) => String(l.id) === id);
    if (idx !== -1) return { view: "reading", index: idx, lessonId: id, bookName: null, chapterName: null };
    // المسألة غير محمّلة بعد (البيانات في الحزمة المؤجلة) — نحتفظ بمعرفها لحلّها لاحقًا
    // index = -1 حتى لا تُعرض مسألة خاطئة (الفهرس 0) قبل التحميل أو عند رابط غير صالح
    return { view: "reading", index: -1, lessonId: id, bookName: null, chapterName: null };
  }

  const bookCh = hash.match(/^#\/book\/([^/]+)(?:\/chapter\/(.+))?$/);
  if (bookCh) {
    const bookName = decode(bookCh[1]);
    const chapterName = bookCh[2] ? decode(bookCh[2]) : null;
    return { view: "chapters", index: 0, lessonId: null, bookName, chapterName };
  }

  const viewMatch = hash.match(/^#\/?(hero|books|lessons|bookmarks|highlights|achievements|admin)$/);
  if (viewMatch) return { view: viewMatch[1], index: 0, lessonId: null, bookName: null, chapterName: null };

  return { view: "hero", index: 0, lessonId: null, bookName: null, chapterName: null };
}

// تحديث وسوم معاينة المشاركة (WhatsApp / Telegram / Facebook) + وسم الوصف
function updateSharePreview({ title, description }: { title: string; description: string }): void {
  ["og:title", "twitter:title"].forEach((prop) => {
    document
      .querySelector(`meta[property="${prop}"]`)
      ?.setAttribute("content", title);
  });
  ["og:description", "twitter:description", "description"].forEach((prop) => {
    const el = document.querySelector(
      prop === "description"
        ? 'meta[name="description"]'
        : `meta[property="${prop}"]`,
    );
    el?.setAttribute("content", description);
  });
  const ogUrl = document.querySelector('meta[property="og:url"]');
  ogUrl?.setAttribute("content", window.location.href);
}

// تحديث بيانات منظمة (JSON-LD) لأجل النتائج الغنية في محركات البحث
function updateStructuredData(obj: Record<string, unknown>): void {
  let el = document.getElementById("ld-json") as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = "ld-json";
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(obj);
}

const PUBLISHER = { "@type": "Organization", name: "الباحث الفقهي", url: "https://fqh.me" };

/**
 * موجّه التطبيق بالروابط الهاشية: يدير الشاشة الحالية والمسألة/الكتاب/الباب المعروض،
 * ويزامن الرابط وعنوان الصفحة ووسوم معاينة المشاركة مع كل تغيير.
 * يدعم رابطاً مباشراً مستقلاً لكل كتاب ولكل باب (للمشاركة وأساس SEO مستقبلي).
 */
export function useHashRoute(lessons: Lesson[]) {
  const initialRoute = useMemo(
    () => parseRoute(window.location.hash || "#/hero", []),
    [],
  );
  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [currentIndex, setCurrentIndex] = useState(initialRoute.index);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(initialRoute.bookName);
  const [openChapterName, setOpenChapterName] = useState<string | null>(initialRoute.chapterName);

  // عند فتح رابط مسألة مباشر والبيانات غير محمّلة بعد — نحلّ المعرّف فور توفرها
  const pendingLessonIdRef = useRef<string | null>(
    initialRoute.view === "reading" ? initialRoute.lessonId : null,
  );
  // معرّف المسألة المعروضة حاليًا — لتثبيت الموضع عند تحديث البيانات (ترتيب جديد/حذف)
  // تأثيرا الحلّ والتسجيل موضوعان أدناه بعد مزامنة المراجع: قاعدة react-hooks/immutability
  // تمنع الكتابة في مرجع قُرئ في تأثير سابق، وحلّ المعرّف يجب أن يسبق تسجيله في نفس الدفعة
  const readingLessonIdRef = useRef<string | null>(null);

  // لحفظ التبويب الأخير الذي كان به قائمة (للرجوع إليه)
  const lastListView = useRef<string>(
    ["books", "chapters", "lessons", "bookmarks", "highlights", "achievements", "admin"].includes(
      initialRoute.view,
    )
      ? initialRoute.view
      : "books",
  );

  const currentIndexRef = useRef(currentIndex);
  const currentViewRef = useRef(currentView);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    if (
      ["books", "chapters", "lessons", "bookmarks", "highlights", "achievements", "admin"].includes(
        currentView,
      )
    ) {
      lastListView.current = currentView;
    }
  }, [currentView]);

  // حلّ المعرّف المعلّق وتثبيت موضع القراءة عند تغيّر البيانات — بعد مزامنة المراجع أعلاه
  useEffect(() => {
    if (lessons.length === 0) return;
    // 1) رابط مباشر معلّق بانتظار البيانات
    if (pendingLessonIdRef.current != null) {
      const wanted = pendingLessonIdRef.current;
      pendingLessonIdRef.current = null;
      const idx = lessons.findIndex((l) => String(l.id) === wanted);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setCurrentView("reading");
      } else if (currentViewRef.current === "reading") {
        // معرّف غير موجود في البيانات — عودة آمنة للفهرس بدل عرض مسألة خاطئة
        setCurrentView(lastListView.current);
      }
      return;
    }
    // 2) تحديث البيانات أثناء القراءة: أعد الحلّ بالمعرّف لا بالفهرس (قد يزيح الترتيب)
    if (currentViewRef.current !== "reading") return;
    const wantedId = readingLessonIdRef.current;
    if (wantedId == null) return;
    const idx = lessons.findIndex((l) => String(l.id) === wantedId);
    if (idx !== -1) {
      if (idx !== currentIndexRef.current) setCurrentIndex(idx);
    } else {
      // حُذفت المسألة المعروضة من البيانات — عودة آمنة بدل شاشة فارغة
      setCurrentView(lastListView.current);
    }
  }, [lessons]);

  // تسجيل معرّف المسألة الظاهرة — يعمل بعد تأثير الحلّ أعلاه (ترتيب الإعلان)
  useEffect(() => {
    if (currentView === "reading") {
      const cur = currentIndex >= 0 ? lessons[currentIndex] : undefined;
      readingLessonIdRef.current = cur ? String(cur.id) : null;
    } else {
      readingLessonIdRef.current = null;
    }
  }, [currentView, currentIndex, lessons]);

  const goToNextLesson = useCallback(() => {
    if (currentIndexRef.current < lessons.length - 1) {
      setCurrentIndex(currentIndexRef.current + 1);
      window.scrollTo({ top: 0 });
    }
  }, [lessons.length]);

  const goToPrevLesson = useCallback(() => {
    if (currentIndexRef.current > 0) {
      setCurrentIndex(currentIndexRef.current - 1);
      window.scrollTo({ top: 0 });
    }
  }, []);

  // الروابط المباشرة: تطبيق تغير الرابط (زر الرجوع أو لصق رابط كتاب/باب/مسألة)
  const applyHashNavigation = useCallback(() => {
    if (window.__forceHeroOnPopstate) {
      window.__forceHeroOnPopstate = false;
      window.history.replaceState({ idx: 0 }, "", "#/hero");
      setCurrentView("hero");
      return;
    }
    const route = parseRoute(window.location.hash || "#/hero", lessons);
    if (route.view === "reading") {
      setCurrentIndex(route.index);
      setCurrentView("reading");
      return;
    }
    if (route.view === "chapters") {
      setSelectedBookName(route.bookName);
      setOpenChapterName(route.chapterName);
      setCurrentView("chapters");
      return;
    }
    setCurrentView(route.view);
  }, [lessons]);

  useEffect(() => {
    window.addEventListener("hashchange", applyHashNavigation);
    window.addEventListener("popstate", applyHashNavigation);
    return () => {
      window.removeEventListener("hashchange", applyHashNavigation);
      window.removeEventListener("popstate", applyHashNavigation);
    };
  }, [applyHashNavigation]);

  // مزامنة الرابط وعنوان الصفحة مع الحالة الحالية (للمشاركة وSEO)
  useEffect(() => {
    const currentLesson = lessons[currentIndex];
    let hash = "#/";

    if (currentView === "reading" && !currentLesson) {
      // أثناء تحميل بيانات الرابط المباشر — نحافظ على الرابط دون الكتابة عليه
      hash = window.location.hash || "#/";
    } else if (currentView === "reading" && currentLesson?.id) {
      hash = `#/lesson/${currentLesson.id}`;
    } else if (currentView === "chapters") {
      if (!selectedBookName) {
        hash = "#/books";
      } else if (openChapterName) {
        hash = `#/book/${encode(selectedBookName)}/chapter/${encode(openChapterName)}`;
      } else {
        hash = `#/book/${encode(selectedBookName)}`;
      }
    } else if (
      ["hero", "books", "lessons", "bookmarks", "highlights", "achievements", "admin"].includes(
        currentView,
      )
    ) {
      hash = `#/${currentView}`;
    }

    if (window.location.hash !== hash) {
      if (window.location.hash === "" || window.location.hash === "#/") {
        window.history.replaceState({ idx: 0 }, "", hash);
      } else {
        window.history.pushState(
          { idx: (window.history.state?.idx || 0) + 1 },
          "",
          hash,
        );
      }
    } else {
      if (
        hash !== "#/hero" &&
        window.history.length <= 2 &&
        !window.history.state?.idx
      ) {
        window.history.replaceState({ idx: 0 }, "", "#/hero");
        window.history.pushState({ idx: 1 }, "", hash);
      } else if (!window.history.state) {
        window.history.replaceState({ idx: 0 }, "", hash);
      }
    }

    // تحديث العنوان ومعاينة المشاركة حسب الشاشة المعروضة
    if (currentView === "reading" && currentLesson?.title) {
      document.title = `${currentLesson.title} — الباحث الفقهي`;
      const snippet = (currentLesson.mainText || "").replace(/\s+/g, " ").trim().slice(0, 150);
      updateSharePreview({
        title: `${currentLesson.title} — الباحث الفقهي`,
        description: snippet ? `${snippet}…` : "منصة تعليمية متكاملة لدراسة الفقه الإسلامي",
      });
      updateStructuredData({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: currentLesson.title,
        description: snippet ? `${snippet}…` : "",
        inLanguage: "ar",
        isPartOf: { "@type": "Book", name: currentLesson.bookName || "" },
        url: window.location.href,
        publisher: PUBLISHER,
      });
    } else if (currentView === "chapters" && selectedBookName) {
      const bookLessons = lessons.filter((l) => (l.bookName || "").trim() === selectedBookName);
      if (openChapterName) {
        // صفحة باب معيّن — عنوان ووصف خاص بالباب
        const chLessons = bookLessons.filter((l) => (l.chapterName || "").trim() === openChapterName);
        const snippet = (chLessons[0]?.mainText || "").replace(/\s+/g, " ").trim().slice(0, 150);
        document.title = `${openChapterName} — ${selectedBookName} — الباحث الفقهي`;
        updateSharePreview({
          title: `${openChapterName} — ${selectedBookName} — الباحث الفقهي`,
          description: snippet
            ? `${snippet}…`
            : `${openChapterName} من ${selectedBookName} — مسائل فقهية موثّقة بأسلوب ميسّر.`,
        });
        updateStructuredData({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: openChapterName,
          description: snippet ? `${snippet}…` : `${openChapterName} من ${selectedBookName}.`,
          inLanguage: "ar",
          isPartOf: { "@type": "Book", name: selectedBookName },
          url: window.location.href,
          publisher: PUBLISHER,
        });
      } else {
        // صفحة كتاب معيّن — عنوان ووصف خاص بالكتاب
        const chaptersCount = new Set(bookLessons.map((l) => (l.chapterName || "").trim())).size;
        const snippet = (bookLessons[0]?.mainText || "").replace(/\s+/g, " ").trim().slice(0, 150);
        document.title = `${selectedBookName} — الباحث الفقهي`;
        updateSharePreview({
          title: `${selectedBookName} — الباحث الفقهي`,
          description: snippet
            ? `${snippet}…`
            : `${selectedBookName} — ${chaptersCount} أبواب من المسائل الفقهية.`,
        });
        updateStructuredData({
          "@context": "https://schema.org",
          "@type": "Book",
          name: selectedBookName,
          description: snippet ? `${snippet}…` : `${selectedBookName} — ${chaptersCount} أبواب من المسائل الفقهية.`,
          inLanguage: "ar",
          url: window.location.href,
          publisher: PUBLISHER,
        });
      }
    } else {
      document.title = "الباحث الفقهي";
      updateSharePreview({
        title: "الباحث الفقهي — منصة تعليم الفقه الإسلامي",
        description: "منصة تعليمية متكاملة لدراسة الفقه الإسلامي بأسلوب عصري ميسّر",
      });
      updateStructuredData({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "الباحث الفقهي",
        url: "https://fqh.me",
        inLanguage: "ar",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://fqh.me/#/lessons?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      });
    }
  }, [currentView, currentIndex, selectedBookName, openChapterName, lessons]);

  const goBackToList = useCallback(() => {
    // ضمان العودة إلى فهرس مسائل الكتاب الحالي وليس مجرد خطوة في السجل
    const lesson = lessons[currentIndexRef.current];
    if (lesson && lesson.bookName) {
      setSelectedBookName(lesson.bookName.trim());
      setOpenChapterName(null);
      setCurrentView("chapters");
    } else {
      setCurrentView(lastListView.current);
    }
  }, [lessons]);

  const smartSetCurrentView = useCallback((view: string) => {
    if (view === "hero") {
      const currentIdx = window.history.state?.idx || 0;
      if (currentIdx > 0) {
        window.__forceHeroOnPopstate = true;
        window.history.go(-currentIdx);
      } else {
        setCurrentView("hero");
      }
    } else {
      setCurrentView(view);
    }
  }, []);

  return {
    currentView,
    setCurrentView: smartSetCurrentView,
    currentIndex,
    setCurrentIndex,
    selectedBookName,
    setSelectedBookName,
    openChapterName,
    setOpenChapterName,
    goToNextLesson,
    goToPrevLesson,
    goBackToList,
  };
}
