import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import { safeSet, safeRemove } from '../utils/safeStorage';
import { mergeLibraries } from '../utils/mergeLibrary';
import { logError } from '../utils/logError';
import type { HighlightItem, UserLibraryData } from '../types';
import {
  syncBookmarks,
  syncHighlights,
  syncNote,
  syncAllNotes,
  syncReadLessons,
  syncStopMarks,
  mergeAndSyncLibrary,
} from '../firebase/services';

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) as string) || fallback) as T;
  } catch {
    return fallback;
  }
}

/**
 * مكتبة المستخدم: المفضلة، الفوائد المقتبسة، الملاحظات، والمسائل المقروءة.
 * تضمن عزل بيانات كل مستخدم بناءً على حسابه.
 * تقوم بدمج بيانات الضيف (إن وجدت) لمرة واحدة عند تسجيل الدخول ثم تحذفها من الجهاز.
 */
export function useUserLibrary({ onStatus }: { onStatus?: (status: string) => void } = {}) {
  const { user, loadUserData, authLoading } = useAuth();

  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [readLessons, setReadLessons] = useState<string[]>([]);
  // علامات التوقف لكل كتاب — ضيف: محلية فقط، مسجل: تُزامن سحابيًا فتظهر على كل الأجهزة
  const [stopMarks, setStopMarks] = useState<Record<string, string>>({});

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const isSyncReady = Boolean(user) && isDataLoaded;
  // تتبّع الجلسة لمنع تسرب علامات مستخدم خرج للتو إلى ضيف جديد على نفس الجهاز
  const prevUidRef = useRef<string | null>(null);

  // عند تسجيل الدخول أو الخروج
  useEffect(() => {
    if (authLoading) return; // ننتظر حتى تنتهي حالة التحميل

    if (!user) {
      // المستخدم كضيف (غير مسجل الدخول) أو قام بتسجيل الخروج للتو
      // نحمّل بيانات الضيف المحفوظة محلياً أو نصفّرها
      // المعرفات تُوحَّد كنصوص دائمًا حتى لا تفشل المطابقة بين رقم ونص
      const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
      const asMarks = (v: unknown): Record<string, string> =>
        v && typeof v === 'object' ? (v as Record<string, string>) : {};
      if (prevUidRef.current) {
        // كان مسجلًا وخرج للتو — امسح مخبأ علاماته حتى لا يتسرب لضيف/مستخدم آخر على نفس الجهاز
        // (باقي البيانات تُعزل أصلًا بمفاتيح guest_* المحذوفة عند الدخول)
        prevUidRef.current = null;
        safeRemove('stopMarks');
        setStopMarks({});
      } else {
        setStopMarks(asMarks(readJsonStorage('stopMarks', {})));
      }
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
    prevUidRef.current = user.uid;

    (async () => {
      onStatus?.('syncing');
      
      // جلب بيانات المستخدم من السحابة
      const cloudData: UserLibraryData = (await loadUserData(user.uid)) || {
        bookmarks: [],
        highlights: [],
        notes: {},
        readLessons: [],
        visits: [],
        stopMarks: {},
      };
      if (cancelled) return;

      // جلب بيانات الضيف المحلية لدمجها (إذا كان لديه بيانات قبل تسجيل الدخول)
      const guestBookmarks = readJsonStorage<string[]>('guest_bookmarks', []);
      const guestHighlights = readJsonStorage<HighlightItem[]>('guest_highlights', []);
      const guestNotes = readJsonStorage<Record<string, string>>('guest_notes', {});
      const guestReadLessons = readJsonStorage<string[]>('guest_readLessons', []);
      const guestStopMarks = readJsonStorage<Record<string, string>>('stopMarks', {});

      // الدمج الذكي (المعرفات كنصوص لتوحيد النوع بين المصادر)
      const merged = mergeLibraries(
        {
          bookmarks: cloudData.bookmarks || [],
          highlights: cloudData.highlights || [],
          notes: cloudData.notes || {},
          readLessons: cloudData.readLessons || [],
          stopMarks: cloudData.stopMarks || {},
        },
        { bookmarks: guestBookmarks, highlights: guestHighlights, notes: guestNotes, readLessons: guestReadLessons, stopMarks: guestStopMarks },
      );
      const mergedBookmarks = merged.bookmarks;
      const mergedHighlights = merged.highlights;
      const mergedNotes = merged.notes;
      const mergedReadLessons = merged.readLessons;
      const mergedStopMarks = merged.stopMarks;

      // تحديث الحالة المحلية
      setBookmarks(mergedBookmarks);
      setHighlights(mergedHighlights);
      setNotes(mergedNotes);
      setReadLessons(mergedReadLessons);
      setStopMarks(mergedStopMarks);

      // رفع البيانات المدمجة للسحابة
      // ⚠️ حذف بيانات الضيف من الجهاز يتم فقط بعد نجاح الرفع — وإلا ضاعت نهائيًا
      let uploaded = false;
      try {
        await Promise.all([
          syncBookmarks(user.uid, mergedBookmarks),
          syncHighlights(user.uid, mergedHighlights),
          syncAllNotes(user.uid, mergedNotes),
          syncReadLessons(user.uid, mergedReadLessons),
          syncStopMarks(user.uid, mergedStopMarks),
        ]);
        uploaded = true;
      } catch (err) {
        // تجاهل الأخطاء المؤقتة — تبقى نسخة الضيف محفوظة للدمج في المرة القادمة
        logError('userLibrary.mergeUpload', err);
      }

      if (!uploaded) {
        setIsDataLoaded(true);
        onStatus?.('offline');
        return;
      }

      // بعد الدمج والرفع بنجاح، نحذف بيانات الضيف من الجهاز
      // لضمان عدم ظهورها لمستخدم آخر يسجل دخوله من نفس الجهاز
      // (عبر safeRemove — التخزين المحظور/الممتلئ لا يجب أن يعلق التحميل)
      safeRemove('guest_bookmarks');
      safeRemove('guest_highlights');
      safeRemove('guest_notes');
      safeRemove('guest_readLessons');

      // إزالة البيانات القديمة المتبقية من الإصدارات السابقة (تنظيف)
      safeRemove('bookmarks');
      safeRemove('highlights');
      safeRemove('notesMap');
      safeRemove('readLessons');
      // جمع المفاتيح أولًا ثم حذفها — الحذف أثناء التكرار يُزيح الفهارس ويُفوّت مفاتيح
      try {
        const staleKeys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && key.startsWith('note_lesson_')) staleKeys.push(key);
        }
        staleKeys.forEach((key) => safeRemove(key));
      } catch { /* تجاهل — التنظيف لا يعلق التحميل */ }

      setIsDataLoaded(true);
      onStatus?.('synced');
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // حفظ محلي لبيانات الضيف (Guest) فقط + مخبأ علامات التوقف للمسجل (أوفلاين)
  useEffect(() => {
    if (!isDataLoaded) return;
    if (!user) {
      safeSet('guest_bookmarks', JSON.stringify(bookmarks));
      safeSet('guest_highlights', JSON.stringify(highlights));
      safeSet('guest_notes', JSON.stringify(notes));
      safeSet('guest_readLessons', JSON.stringify(readLessons));
    }
    // علامات التوقف تُخبَّأ محليًا دائمًا (للضيف هي الأصل، وللمسجل مخبأ أوفلاين يُمسح عند الخروج)
    safeSet('stopMarks', JSON.stringify(stopMarks));
  }, [bookmarks, highlights, notes, readLessons, stopMarks, user, isDataLoaded]);

  // المزامنة مع السحابة دفعة واحدة بعد هدوء التغييرات (تجنّب كتابة لكل ضغطة متتالية)
  // دمج عند الكتابة: تُقرأ النسخة الأحدث وتُدمج قبل الرفع فلا تمحو تعديلات جهاز آخر
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isSyncReady || !user) return;
    const uid = user.uid;
    const snapshot = { bookmarks, highlights, notes, readLessons, stopMarks };
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      mergeAndSyncLibrary(uid, snapshot).catch((e) => logError('userLibrary.sync', e, { section: 'merge' }));
    }, 800);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [bookmarks, highlights, notes, readLessons, stopMarks, isSyncReady, user]);

  // الدوال المساعدة للتحكم بالبيانات (المعرفات كنصوص دائمًا)
  const toggleBookmark = useCallback((lessonId: string | number) => {
    const key = String(lessonId);
    setBookmarks((prev) => {
      const normalized = prev.map(String);
      return normalized.includes(key)
        ? normalized.filter((id) => id !== key)
        : [...normalized, key];
    });
  }, []);

  const addHighlight = useCallback((highlight: HighlightItem) => {
    setHighlights((prev) => [...prev, highlight]);
  }, []);

  const deleteHighlight = useCallback((highlightId: string | number) => {
    // مقارنة كنصوص — المعرف قد يأتي رقمًا من مصدر ونصًا من آخر فيفشل الحذف بصمت
    const key = String(highlightId);
    setHighlights((prev) => prev.filter((h) => String(h.id) !== key));
  }, []);

  const saveNoteForLesson = useCallback((lessonId: string | number, text: string) => {
    const key = String(lessonId);
    setNotes((prev) => ({ ...prev, [key]: text }));
    if (user && isSyncReady) syncNote(user.uid, key, text).catch((e) => logError('userLibrary.sync', e, { section: 'note' }));
  }, [user, isSyncReady]);

  const toggleReadLesson = useCallback((lessonId: string | number) => {
    setReadLessons((prev) =>
      prev.includes(String(lessonId))
        ? prev.filter((id) => id !== String(lessonId))
        : [...prev, String(lessonId)]
    );
  }, []);

  // استعادة نسخة احتياطية (دمج مع الحالي بدون فقد)
  const restoreLibrary = useCallback((data: {
    bookmarks?: string[]; highlights?: HighlightItem[]; notes?: Record<string, string>; readLessons?: string[]; stopMarks?: Record<string, string>;
  }) => {
    if (Array.isArray(data.bookmarks)) {
      setBookmarks((prev) => Array.from(new Set([...prev.map(String), ...data.bookmarks!.map(String)])));
    }
    if (Array.isArray(data.highlights)) {
      setHighlights((prev) => {
        const map = new Map(prev.map((h) => [String(h.id ?? h.text), h] as const));
        data.highlights!.forEach((h) => { if (h) map.set(String(h.id ?? h.text), h); });
        return Array.from(map.values());
      });
    }
    if (data.notes && typeof data.notes === 'object') {
      setNotes((prev) => ({ ...prev, ...data.notes }));
    }
    if (Array.isArray(data.readLessons)) {
      setReadLessons((prev) => Array.from(new Set([...prev.map(String), ...data.readLessons!.map(String)])));
    }
    if (data.stopMarks && typeof data.stopMarks === 'object') {
      // الاستعادة تُغلّب النسخة (كملاحظاتها تمامًا) — وإلا بدت الاستعادة وكأنها لم تفعل شيئًا
      setStopMarks((prev) => ({ ...prev, ...data.stopMarks }));
    }
  }, []);

  return {
    bookmarks,
    highlights,
    notes,
    readLessons,
    stopMarks,
    setStopMarks,
    toggleBookmark,
    addHighlight,
    deleteHighlight,
    saveNoteForLesson,
    toggleReadLesson,
    restoreLibrary,
  };
}
