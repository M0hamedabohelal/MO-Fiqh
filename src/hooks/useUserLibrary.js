import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import {
  syncBookmarks,
  syncHighlights,
  syncNote,
  syncAllNotes,
  syncReadLessons,
} from '../firebase/services';

// جمع الملاحظات القديمة المخزنة في localStorage بصيغة note_lesson_ID
function loadLocalNotes() {
  const map = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('note_lesson_')) {
      map[key.replace('note_lesson_', '')] = localStorage.getItem(key);
    }
  }
  return map;
}

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * مكتبة المستخدم: المفضلة، الفوائد المقتبسة، الملاحظات، والمسائل المقروءة.
 * تُحفظ محلياً في localStorage، وتُدمج مع بيانات السحابة عند تسجيل الدخول،
 * ثم تُزامن أي تغيير لاحق تلقائياً.
 * onStatus: دالة اختيارية لتلقي حالة المزامنة ('syncing' | 'synced').
 */
export function useUserLibrary({ onStatus } = {}) {
  const { user, loadUserData } = useAuth();

  const [bookmarks, setBookmarks] = useState(() => readJsonStorage('bookmarks', []));
  const [highlights, setHighlights] = useState(() => readJsonStorage('highlights', []));
  const [notes, setNotes] = useState(loadLocalNotes);
  const [readLessons, setReadLessons] = useState(() => readJsonStorage('readLessons', []));

  // حفظ نسخة محلية من كل تغيير
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('highlights', JSON.stringify(highlights));
    localStorage.setItem('notesMap', JSON.stringify(notes));
    localStorage.setItem('readLessons', JSON.stringify(readLessons));
  }, [bookmarks, highlights, notes, readLessons]);

  // مزامنة السحابة عند تغيير البيانات — فقط بعد اكتمال الدمج الأول للمستخدم
  // (عشان مفيش سباق يخلي التزامن المحلي يمسح دمج السحابة قبل ما يتم)
  const mergeStartedRef = useRef(new Set());
  const [readyUid, setReadyUid] = useState(null);
  const isSyncReady = Boolean(user) && readyUid === user?.uid;

  useEffect(() => {
    if (!isSyncReady) return;
    syncBookmarks(user.uid, bookmarks).catch(() => {});
  }, [bookmarks, isSyncReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSyncReady) return;
    syncHighlights(user.uid, highlights).catch(() => {});
  }, [highlights, isSyncReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSyncReady) return;
    syncReadLessons(user.uid, readLessons).catch(() => {});
  }, [readLessons, isSyncReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // دمج بيانات المستخدم من السحابة عند أول تسجيل دخول (اتحاد المفضلة والفوائد والملاحظات)
  // نقرأ الحالة من الـ closure عمداً: دي لقطة البيانات المحلية قبل الدخول — اللي المفروض تندمج
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    if (mergeStartedRef.current.has(uid)) return;
    mergeStartedRef.current.add(uid);

    let cancelled = false;
    (async () => {
      onStatus?.('syncing');
      const cloudData = await loadUserData(uid);
      if (cancelled) return;

      if (cloudData) {
        const mergedBookmarks = Array.from(new Set([...(cloudData.bookmarks || []), ...bookmarks]));

        const highlightMap = new Map();
        [...highlights, ...(cloudData.highlights || [])].forEach((h) => {
          highlightMap.set(String(h.id ?? h.text), h);
        });
        const mergedHighlights = Array.from(highlightMap.values());

        const mergedNotes = { ...loadLocalNotes(), ...(cloudData.notes || {}), ...notes };

        const mergedReadLessons = Array.from(
          new Set([...readLessons, ...(cloudData.readLessons || [])].map(String))
        );

        setBookmarks(mergedBookmarks);
        setHighlights(mergedHighlights);
        setNotes(mergedNotes);
        setReadLessons(mergedReadLessons);

        try {
          await Promise.all([
            syncBookmarks(uid, mergedBookmarks),
            syncHighlights(uid, mergedHighlights),
            syncAllNotes(uid, mergedNotes),
            syncReadLessons(uid, mergedReadLessons),
          ]);
        } catch {
          // تجاهل أخطاء المزامنة الأولى — سيُعاد المحاولة عند أي تغيير تالٍ
        }
      }
      if (!cancelled) {
        // فتح باب المزامنة بعد اكتمال الدمج
        setReadyUid(uid);
        onStatus?.('synced');
      }
    })();

    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBookmark = useCallback((lessonId) => {
    setBookmarks((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  }, []);

  const addHighlight = useCallback((highlight) => {
    setHighlights((prev) => [...prev, highlight]);
  }, []);

  const deleteHighlight = useCallback((highlightId) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }, []);

  // حفظ ملاحظة مسألة (محلي + سحابة)
  const saveNoteForLesson = useCallback((lessonId, text) => {
    const key = String(lessonId);
    setNotes((prev) => ({ ...prev, [key]: text }));
    if (user) syncNote(user.uid, key, text).catch(() => {});
  }, [user]);

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
