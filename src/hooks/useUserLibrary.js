import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import {
  syncBookmarks,
  syncHighlights,
  syncNote,
  syncAllNotes,
  syncReadLessons,
} from '../firebase/services';

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * مكتبة المستخدم: المفضلة، الفوائد المقتبسة، الملاحظات، والمسائل المقروءة.
 * تضمن عزل بيانات كل مستخدم بناءً على حسابه.
 * تقوم بدمج بيانات الضيف (إن وجدت) لمرة واحدة عند تسجيل الدخول ثم تحذفها من الجهاز.
 */
export function useUserLibrary({ onStatus } = {}) {
  const { user, loadUserData, authLoading } = useAuth();

  const [bookmarks, setBookmarks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState({});
  const [readLessons, setReadLessons] = useState([]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const isSyncReady = Boolean(user) && isDataLoaded;

  // عند تسجيل الدخول أو الخروج
  useEffect(() => {
    if (authLoading) return; // ننتظر حتى تنتهي حالة التحميل

    if (!user) {
      // المستخدم كضيف (غير مسجل الدخول) أو قام بتسجيل الخروج للتو
      // نحمّل بيانات الضيف المحفوظة محلياً أو نصفّرها
      // المعرفات تُوحَّد كنصوص دائمًا حتى لا تفشل المطابقة بين رقم ونص
      const asStringArray = (v) => (Array.isArray(v) ? v.map(String) : []);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookmarks(asStringArray(readJsonStorage('guest_bookmarks', [])));
      setHighlights(readJsonStorage('guest_highlights', []));
      setNotes(readJsonStorage('guest_notes', {}));
      setReadLessons(asStringArray(readJsonStorage('guest_readLessons', [])));
      setIsDataLoaded(true);
      return;
    }

    // المستخدم مسجل الدخول
    let cancelled = false;
    setIsDataLoaded(false);

    (async () => {
      onStatus?.('syncing');
      
      // جلب بيانات المستخدم من السحابة
      const cloudData = (await loadUserData(user.uid)) || {};
      if (cancelled) return;

      // جلب بيانات الضيف المحلية لدمجها (إذا كان لديه بيانات قبل تسجيل الدخول)
      const guestBookmarks = readJsonStorage('guest_bookmarks', []);
      const guestHighlights = readJsonStorage('guest_highlights', []);
      const guestNotes = readJsonStorage('guest_notes', {});
      const guestReadLessons = readJsonStorage('guest_readLessons', []);

      // الدمج الذكي (المعرفات كنصوص لتوحيد النوع بين المصادر)
      const mergedBookmarks = Array.from(
        new Set([...(cloudData.bookmarks || []), ...guestBookmarks].map(String))
      );
      
      const highlightMap = new Map();
      [...guestHighlights, ...(cloudData.highlights || [])].forEach((h) => {
        highlightMap.set(String(h.id ?? h.text), h);
      });
      const mergedHighlights = Array.from(highlightMap.values());

      const mergedNotes = { ...guestNotes, ...(cloudData.notes || {}) };

      const mergedReadLessons = Array.from(
        new Set([...guestReadLessons, ...(cloudData.readLessons || [])].map(String))
      );

      // تحديث الحالة المحلية
      setBookmarks(mergedBookmarks);
      setHighlights(mergedHighlights);
      setNotes(mergedNotes);
      setReadLessons(mergedReadLessons);

      // رفع البيانات المدمجة للسحابة
      // ⚠️ حذف بيانات الضيف من الجهاز يتم فقط بعد نجاح الرفع — وإلا ضاعت نهائيًا
      let uploaded = false;
      try {
        await Promise.all([
          syncBookmarks(user.uid, mergedBookmarks),
          syncHighlights(user.uid, mergedHighlights),
          syncAllNotes(user.uid, mergedNotes),
          syncReadLessons(user.uid, mergedReadLessons),
        ]);
        uploaded = true;
      } catch {
        // تجاهل الأخطاء المؤقتة — تبقى نسخة الضيف محفوظة للدمج في المرة القادمة
      }

      if (!uploaded) {
        setIsDataLoaded(true);
        onStatus?.('offline');
        return;
      }

      // بعد الدمج والرفع بنجاح، نحذف بيانات الضيف من الجهاز
      // لضمان عدم ظهورها لمستخدم آخر يسجل دخوله من نفس الجهاز
      localStorage.removeItem('guest_bookmarks');
      localStorage.removeItem('guest_highlights');
      localStorage.removeItem('guest_notes');
      localStorage.removeItem('guest_readLessons');
      
      // إزالة البيانات القديمة المتبقية من الإصدارات السابقة (تنظيف)
      localStorage.removeItem('bookmarks');
      localStorage.removeItem('highlights');
      localStorage.removeItem('notesMap');
      localStorage.removeItem('readLessons');
      // جمع المفاتيح أولًا ثم حذفها — الحذف أثناء التكرار يُزيح الفهارس ويُفوّت مفاتيح
      const staleKeys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith('note_lesson_')) staleKeys.push(key);
      }
      staleKeys.forEach((key) => localStorage.removeItem(key));

      setIsDataLoaded(true);
      onStatus?.('synced');
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // حفظ محلي لبيانات الضيف (Guest) فقط
  useEffect(() => {
    if (user) return; // المسجل يتم حفظه في السحابة
    if (!isDataLoaded) return;
    
    localStorage.setItem('guest_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('guest_highlights', JSON.stringify(highlights));
    localStorage.setItem('guest_notes', JSON.stringify(notes));
    localStorage.setItem('guest_readLessons', JSON.stringify(readLessons));
  }, [bookmarks, highlights, notes, readLessons, user, isDataLoaded]);

  // المزامنة مع السحابة دفعة واحدة بعد هدوء التغييرات (تجنّب كتابة لكل ضغطة متتالية)
  const syncTimer = useRef(null);
  useEffect(() => {
    if (!isSyncReady) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncBookmarks(user.uid, bookmarks).catch(() => {});
      syncHighlights(user.uid, highlights).catch(() => {});
      syncReadLessons(user.uid, readLessons).catch(() => {});
    }, 800);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [bookmarks, highlights, readLessons, isSyncReady, user]);

  // الدوال المساعدة للتحكم بالبيانات (المعرفات كنصوص دائمًا)
  const toggleBookmark = useCallback((lessonId) => {
    const key = String(lessonId);
    setBookmarks((prev) => {
      const normalized = prev.map(String);
      return normalized.includes(key)
        ? normalized.filter((id) => id !== key)
        : [...normalized, key];
    });
  }, []);

  const addHighlight = useCallback((highlight) => {
    setHighlights((prev) => [...prev, highlight]);
  }, []);

  const deleteHighlight = useCallback((highlightId) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }, []);

  const saveNoteForLesson = useCallback((lessonId, text) => {
    const key = String(lessonId);
    setNotes((prev) => ({ ...prev, [key]: text }));
    if (user && isSyncReady) syncNote(user.uid, key, text).catch(() => {});
  }, [user, isSyncReady]);

  const toggleReadLesson = useCallback((lessonId) => {
    setReadLessons((prev) =>
      prev.includes(String(lessonId))
        ? prev.filter((id) => id !== String(lessonId))
        : [...prev, String(lessonId)]
    );
  }, []);

  const markLessonRead = useCallback((lessonId) => {
    const key = String(lessonId);
    setReadLessons((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  return {
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
  };
}
