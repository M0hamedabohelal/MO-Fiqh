import { useState, useEffect, useCallback, useRef } from 'react';
import type { SetStateAction } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import { safeSet, safeRemove } from '../utils/safeStorage';
import { clearStopMarkTouchedAt } from '../utils/stopMarkRecency';
import { mergeLibraries, mergeTombs, emptyTombs, cleanTombs, applyTombsToMerged, pruneTombs } from '../utils/mergeLibrary';
import type { TombstoneMap } from '../utils/mergeLibrary';
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

// مقارنات مجموعات (بلا ترتيب) — لاكتشاف "هل تغيّر القسم فعلًا؟" ومنع الرفع الصدى
function strArrEqual(a: string[], b: string[]): boolean {
  const na = a.map(String);
  const nb = b.map(String);
  return na.length === nb.length && na.every((x) => nb.includes(x));
}

function highlightsEqual(a: HighlightItem[], b: HighlightItem[]): boolean {
  if (a.length !== b.length) return false;
  const mb = new Map(b.map((h) => [String(h.id ?? h.text), JSON.stringify(h)]));
  return a.every((h) => mb.get(String(h.id ?? h.text)) === JSON.stringify(h));
}

function mapEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => b[k] === a[k]);
}

interface LibrarySnapshot {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  stopMarks: Record<string, string>;
}

function snapshotsEqual(a: LibrarySnapshot, b: LibrarySnapshot): boolean {
  return (
    strArrEqual(a.bookmarks, b.bookmarks) &&
    highlightsEqual(a.highlights, b.highlights) &&
    mapEqual(a.notes, b.notes) &&
    strArrEqual(a.readLessons, b.readLessons) &&
    mapEqual(a.stopMarks, b.stopMarks)
  );
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
  // وسم "معدّل محليًا" لكل قسم — القسم النظيف تُستبدل قيمته بما يصل من الأجهزة الأخرى
  // (فينتشر التعديل والحذف)، والقسم المعدّل يُدمج إضافيًا فقط حمايةً لمسودة المستخدم
  const dirtyRef = useRef({ bookmarks: false, highlights: false, notes: false, readLessons: false, stopMarks: false });
  // آخر حالة كُتبت بنجاح — تطابقها مع الحالية يعني "لا جديد للرفع" (يمنع الرفع الصدى)
  const lastWrittenRef = useRef<LibrarySnapshot | null>(null);
  // شواهد الحذف — تسجيل صريح "حُذف هذا المفتاح عمدًا" يُزامن سحابيًا:
  // أي عنصر مشهود بحذفه يُسقط من كل دمج قادم (مستمع/رفع/دخول) ولا يعود أبدًا
  // إلا بإعادة إضافته صراحةً (الوجود المحلي يفوز دائمًا ويُلغي الشاهد).
  // تُحفظ نسخة لكل حساب محليًا للعمل أوفلاين، وتُدمج مع سحابة الشواهد عند الدخول.
  const tombRef = useRef<TombstoneMap>(emptyTombs());
  const tombStorageKey = (uid: string): string => `tombs_${uid}`;
  const persistTombs = useCallback((uid: string): void => {
    safeSet(tombStorageKey(uid), JSON.stringify(tombRef.current));
  }, []);
  const loadPersistedTombs = (uid: string): TombstoneMap =>
    cleanTombs(readJsonStorage(`tombs_${uid}`, {}));
  const recordTomb = (section: keyof TombstoneMap, key: string | number): void => {
    const k = String(key);
    if (!tombRef.current[section][k]) tombRef.current[section][k] = Date.now();
  };
  const clearTomb = (section: keyof TombstoneMap, key: string | number): void => {
    const k = String(key);
    if (k in tombRef.current[section]) delete tombRef.current[section][k];
  };

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
        // سجل حداثة العلامات محلي أيضًا — يُمسح معها لنفس السبب
        clearStopMarkTouchedAt();
        dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false, stopMarks: false };
        lastWrittenRef.current = null;
        // الشواهد في الذاكرة تُصفَّر (النسخة المحفوظة لكل حساب تبقى للولوج التالي من نفس الحساب)
        tombRef.current = emptyTombs();
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
        tombs: emptyTombs(),
      };
      if (cancelled) return;

      // شواهد الحذف: اتحاد سحابة الشواهد مع المحفوظة محليًا لهذا الحساب (للعمل أوفلاين)
      tombRef.current = mergeTombs(cleanTombs(cloudData.tombs), loadPersistedTombs(user.uid));
      persistTombs(user.uid);

      // جلب بيانات الضيف المحلية لدمجها (إذا كان لديه بيانات قبل تسجيل الدخول)
      const guestBookmarks = readJsonStorage<string[]>('guest_bookmarks', []);
      const guestHighlights = readJsonStorage<HighlightItem[]>('guest_highlights', []);
      const guestNotes = readJsonStorage<Record<string, string>>('guest_notes', {});
      const guestReadLessons = readJsonStorage<string[]>('guest_readLessons', []);
      const guestStopMarks = readJsonStorage<Record<string, string>>('stopMarks', {});

      const hasGuestData =
        guestBookmarks.length > 0 ||
        guestHighlights.length > 0 ||
        Object.keys(guestNotes).length > 0 ||
        guestReadLessons.length > 0 ||
        Object.keys(guestStopMarks).length > 0;

      let initialBookmarks = cloudData.bookmarks || [];
      let initialHighlights = cloudData.highlights || [];
      let initialNotes = cloudData.notes || {};
      let initialReadLessons = cloudData.readLessons || [];
      let initialStopMarks = cloudData.stopMarks || {};

      // رفع بيانات الضيف المدمجة — الحذف من الجهاز فقط بعد نجاح الرفع
      let mergeUploaded = !hasGuestData; // بلا بيانات ضيف: السحابة مطابقة أصلًا
      if (hasGuestData) {
        const merged = mergeLibraries(
          {
            bookmarks: initialBookmarks,
            highlights: initialHighlights,
            notes: initialNotes,
            readLessons: initialReadLessons,
            stopMarks: initialStopMarks,
          },
          {
            bookmarks: guestBookmarks,
            highlights: guestHighlights,
            notes: guestNotes,
            readLessons: guestReadLessons,
            stopMarks: guestStopMarks,
          },
        );
        // إسقاط المشهود بحذفه — إلا ما أعاده الضيف صراحةً (الوجود يلغي الشاهد)
        const guestLocal = {
          bookmarks: guestBookmarks,
          highlights: guestHighlights,
          notes: guestNotes,
          readLessons: guestReadLessons,
          stopMarks: guestStopMarks,
        };
        const dropped = applyTombsToMerged(merged, guestLocal, tombRef.current);
        initialBookmarks = dropped.bookmarks;
        initialHighlights = dropped.highlights;
        initialNotes = dropped.notes;
        initialReadLessons = dropped.readLessons;
        initialStopMarks = dropped.stopMarks;
        tombRef.current = pruneTombs(tombRef.current, {
          bookmarks: initialBookmarks,
          highlights: initialHighlights,
          notes: initialNotes,
          readLessons: initialReadLessons,
          stopMarks: initialStopMarks,
        });
        persistTombs(user.uid);
        try {
          await Promise.all([
            syncBookmarks(user.uid, initialBookmarks),
            syncHighlights(user.uid, initialHighlights),
            syncAllNotes(user.uid, initialNotes),
            syncReadLessons(user.uid, initialReadLessons),
            syncStopMarks(user.uid, initialStopMarks),
          ]);
          mergeUploaded = true;
          safeRemove('guest_bookmarks');
          safeRemove('guest_highlights');
          safeRemove('guest_notes');
          safeRemove('guest_readLessons');
        } catch (err) {
          // تبقى نسخة الضيف محفوظة للدمج في المرة القادمة — وlastWritten فارغ فيُعاد الرفع تلقائيًا
          logError('userLibrary.mergeUpload', err);
        }
      }

      setBookmarks(initialBookmarks);
      setHighlights(initialHighlights);
      setNotes(initialNotes);
      setReadLessons(initialReadLessons);
      setStopMarks(initialStopMarks);

      const initialSnapshot = {
        bookmarks: initialBookmarks,
        highlights: initialHighlights,
        notes: initialNotes,
        readLessons: initialReadLessons,
        stopMarks: initialStopMarks,
      };
      // آخر كتابة ناجحة تُسجَّل فقط عند تطابق السحابة فعليًا — الفشل يُبقي الباب مفتوحًا لإعادة الرفع
      lastWrittenRef.current = mergeUploaded ? initialSnapshot : null;
      dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false, stopMarks: false };

      // إزالة البيانات القديمة المتبقية من الإصدارات السابقة (تنظيف)
      safeRemove('bookmarks');
      safeRemove('highlights');
      safeRemove('notesMap');
      safeRemove('readLessons');
      try {
        const staleKeys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && key.startsWith('note_lesson_')) staleKeys.push(key);
        }
        staleKeys.forEach((key) => safeRemove(key));
      } catch { /* تجاهل — التنظيف لا يعلق التحميل */ }

      setIsDataLoaded(true);
      onStatus?.(mergeUploaded ? 'synced' : 'offline');
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
  // مهلة قصيرة (250ms) تكفي لدمج النقرات المزدوجة مع استجابة أسرع.
  // دمج عند الكتابة: تُقرأ النسخة الأحدث وتُدمج قبل الرفع فلا تمحو تعديلات جهاز آخر.
  // تطابق الحالة مع آخر كتابة ناجحة = لا جديد (يمنع الرفع الصدى بعد استبدال قادم من مستمع).
  // diff-first: مفاتيح اختفت منذ آخر كتابة = حذف عمدًا (شاهد)، ومفاتيح عادت = إلغاء الشاهد.
  // بهذا تُسجَّل الشواهد مركزيًا من أي مسار (زر/تقليم/ترحيل) دون تتبع كل استدعاء.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isSyncReady || !user) return;
    const uid = user.uid;
    const snapshot = { bookmarks, highlights, notes, readLessons, stopMarks };
    if (lastWrittenRef.current && snapshotsEqual(snapshot, lastWrittenRef.current)) return;
    if (lastWrittenRef.current) {
      const prev = lastWrittenRef.current;
      const diffSection = (
        section: keyof TombstoneMap,
        prevIds: string[],
        curIds: string[],
        curMap: (id: string) => boolean,
      ): void => {
        prevIds.forEach((id) => {
          if (!curMap(id)) recordTomb(section, id);
          else clearTomb(section, id);
        });
        curIds.forEach((id) => clearTomb(section, id));
      };
      const sIds = (a: string[]): string[] => a.map(String);
      diffSection('bookmarks', sIds(prev.bookmarks), sIds(snapshot.bookmarks), (id) => sIds(snapshot.bookmarks).includes(id));
      diffSection('readLessons', sIds(prev.readLessons), sIds(snapshot.readLessons), (id) => sIds(snapshot.readLessons).includes(id));
      diffSection(
        'highlightIds',
        prev.highlights.map((h) => String(h.id ?? h.text)),
        snapshot.highlights.map((h) => String(h.id ?? h.text)),
        (id) => snapshot.highlights.some((h) => String(h.id ?? h.text) === id),
      );
      diffSection('noteKeys', Object.keys(prev.notes), Object.keys(snapshot.notes), (k) => k in snapshot.notes);
      diffSection('stopMarkKeys', Object.keys(prev.stopMarks), Object.keys(snapshot.stopMarks), (k) => k in snapshot.stopMarks);
      persistTombs(uid);
    }
    const tombs = tombRef.current;
    // base للدمج الثلاثي: آخر حالة مكتوبة بنجاح (غيابها = أول رفع: كل المحلي جديد)
    const base = lastWrittenRef.current ?? { bookmarks: [], highlights: [], notes: {}, readLessons: [], stopMarks: {} };
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      onStatus?.('syncing');
      mergeAndSyncLibrary(uid, snapshot, base, tombs)
        .then(({ data, tombs }) => {
          tombRef.current = tombs;
          persistTombs(uid);
          lastWrittenRef.current = data;
          dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false, stopMarks: false };
          // محاذاة: الدمج الثلاثي قد يغلّب السحابة (الأحدث) على قيمة محلية قديمة —
          // نعكس النتيجة على الحالة حتى لا يعرض الجهاز قيمة تجاوزها الدمج
          // (الحارس يمنع الصدى: الحالة المطابقة لآخر كتابة لا تُعاد كتابتها)
          if (!mapEqual(snapshot.stopMarks, data.stopMarks)) {
            setStopMarks(data.stopMarks);
          }
          if (!mapEqual(snapshot.notes, data.notes)) {
            setNotes(data.notes);
          }
          onStatus?.('synced');
        })
        .catch((e) => {
          logError('userLibrary.sync', e, { section: 'merge' });
          onStatus?.('offline');
        });
    }, 250);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [bookmarks, highlights, notes, readLessons, stopMarks, isSyncReady, user, onStatus, persistTombs]);

  // اشتراك لحظي: الرفع وحده لا يكفي — الجهاز الآخر المفتوح أصلًا لا يعيد الجلب إلا عند الدخول.
  // هذا المستمع يلتقط تعديلات الأجهزة الأخرى فور وصولها (علامة وُضعت على الفون تظهر على اللاب المفتوح).
  // القسم النظيف (بلا مسودات محلية) يُستبدل بالوارد — فينتشر التعديل والحذف معًا.
  // القسم المعدّل محليًا يُدمج إضافيًا فقط حمايةً للمسودة. المقارنة تمنع حلقات المزامنة.
  useEffect(() => {
    if (!isSyncReady || !user) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { getFirestore } = await import('../firebase/config');
        const { db, fsMod } = await getFirestore();
        if (cancelled) return;
        const colRef = fsMod.collection(db, 'users', user.uid, 'data');
        unsub = fsMod.onSnapshot(colRef, (snap) => {
          const cloud: { bookmarks: string[]; highlights: HighlightItem[]; notes: Record<string, string>; readLessons: string[]; stopMarks: Record<string, string> } =
            { bookmarks: [], highlights: [], notes: {}, readLessons: [], stopMarks: {} };
          snap.forEach((d) => {
            const v = d.data() as Record<string, unknown>;
            if (d.id === 'bookmarks' && Array.isArray(v.items)) cloud.bookmarks = (v.items as unknown[]).map(String);
            else if (d.id === 'highlights' && Array.isArray(v.items)) cloud.highlights = v.items as HighlightItem[];
            else if (d.id === 'notes' && v.notes && typeof v.notes === 'object') cloud.notes = v.notes as Record<string, string>;
            else if (d.id === 'readLessons' && Array.isArray(v.items)) cloud.readLessons = (v.items as unknown[]).map(String);
            else if (d.id === 'stopMarks' && v.marks && typeof v.marks === 'object') cloud.stopMarks = v.marks as Record<string, string>;
          });

          // منع حلقة الصدى: إذا كانت البيانات القادمة من السحابة مطابقة لما كتبناه للتو، نتجاهلها
          if (lastWrittenRef.current && snapshotsEqual(cloud, lastWrittenRef.current)) {
            return;
          }

          // تحديث قادم من جهاز آخر: نحدّث lastWrittenRef لمنع إعادة الرفع الصدى
          lastWrittenRef.current = cloud;
          // المشهود بحذفه لا يعود أبدًا — حتى لو ما زال في السحابة (جهاز آخر لم يحذف بعد)
          const T = tombRef.current;
          const notTombedArr = (section: keyof TombstoneMap, ids: string[], localIds: string[]): string[] =>
            ids.filter((id) => localIds.includes(id) || !T[section][id]);
          const notTombedMap = (section: keyof TombstoneMap, obj: Record<string, string>, localObj: Record<string, string>): Record<string, string> =>
            Object.fromEntries(Object.entries(obj).filter(([k]) => k in localObj || !T[section][k]));
          const notTombedHl = (items: HighlightItem[], localItems: HighlightItem[]): HighlightItem[] =>
            items.filter((h) => {
              const id = String(h.id ?? h.text);
              return localItems.some((l) => String(l.id ?? l.text) === id) || !T.highlightIds[id];
            });

          setBookmarks((prev) => {
            const prevNorm = prev.map(String);
            const admitted = notTombedArr('bookmarks', cloud.bookmarks, prevNorm);
            if (strArrEqual(prev, admitted)) return prev;
            if (dirtyRef.current.bookmarks) {
              return Array.from(new Set([...prevNorm, ...admitted.filter((k) => !prevNorm.includes(k))]));
            }
            return admitted;
          });

          setReadLessons((prev) => {
            const prevNorm = prev.map(String);
            const admitted = notTombedArr('readLessons', cloud.readLessons, prevNorm);
            if (strArrEqual(prev, admitted)) return prev;
            if (dirtyRef.current.readLessons) {
              return Array.from(new Set([...prevNorm, ...admitted.filter((k) => !prevNorm.includes(k))]));
            }
            return admitted;
          });

          setHighlights((prev) => {
            const admitted = notTombedHl(cloud.highlights, prev);
            if (highlightsEqual(prev, admitted)) return prev;
            if (dirtyRef.current.highlights) {
              const map = new Map(prev.map((h) => [String(h.id ?? h.text), h] as const));
              admitted.forEach((h) => { if (h) map.set(String(h.id ?? h.text), h); });
              return Array.from(map.values());
            }
            return admitted;
          });

          setNotes((prev) => {
            const admitted = notTombedMap('noteKeys', cloud.notes, prev);
            if (mapEqual(prev, admitted)) return prev;
            if (dirtyRef.current.notes) {
              const next = { ...prev };
              Object.entries(admitted).forEach(([k, v]) => { if (!(k in next)) next[k] = v; });
              return next;
            }
            return { ...admitted };
          });

          setStopMarks((prev) => {
            const admitted = notTombedMap('stopMarkKeys', cloud.stopMarks, prev);
            if (mapEqual(prev, admitted)) return prev;
            if (dirtyRef.current.stopMarks) {
              const next = { ...prev };
              Object.entries(admitted).forEach(([k, v]) => { if (!(k in next)) next[k] = v; });
              return next;
            }
            return { ...admitted };
          });

          onStatus?.('synced');
        });
      } catch {
        // بلا اتصال: يبقى الجلب عند الدخول هو المصدر — لا كسر
      }
    })();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, [user, isSyncReady, onStatus]);

  // الدوال المساعدة للتحكم بالبيانات (المعرفات كنصوص دائمًا)
  // كل تعديل صادر عن المستخدم يوسم قسمه "معدّلًا" — فيُحمى من الاستبدال القادم من مستمع الأجهزة
  const toggleBookmark = useCallback((lessonId: string | number) => {
    const key = String(lessonId);
    dirtyRef.current.bookmarks = true;
    setBookmarks((prev) => {
      const normalized = prev.map(String);
      return normalized.includes(key)
        ? normalized.filter((id) => id !== key)
        : [...normalized, key];
    });
  }, []);

  const addHighlight = useCallback((highlight: HighlightItem) => {
    dirtyRef.current.highlights = true;
    setHighlights((prev) => [...prev, highlight]);
  }, []);

  const deleteHighlight = useCallback((highlightId: string | number) => {
    // مقارنة كنصوص — المعرف قد يأتي رقمًا من مصدر ونصًا من آخر فيفشل الحذف بصمت
    const key = String(highlightId);
    dirtyRef.current.highlights = true;
    setHighlights((prev) => prev.filter((h) => String(h.id) !== key));
  }, []);

  const saveNoteForLesson = useCallback((lessonId: string | number, text: string) => {
    const key = String(lessonId);
    dirtyRef.current.notes = true;
    const cleanText = text.trim();
    setNotes((prev) => {
      const next = { ...prev };
      if (!cleanText) {
        delete next[key];
      } else {
        next[key] = text;
      }
      return next;
    });
    if (user && isSyncReady) {
      syncNote(user.uid, key, cleanText).catch((e) => logError('userLibrary.sync', e, { section: 'note' }));
    }
  }, [user, isSyncReady]);

  const toggleReadLesson = useCallback((lessonId: string | number) => {
    dirtyRef.current.readLessons = true;
    setReadLessons((prev) =>
      prev.includes(String(lessonId))
        ? prev.filter((id) => id !== String(lessonId))
        : [...prev, String(lessonId)]
    );
  }, []);

  // نسخة مغلفة من setStopMarks للمستهلكين (App/الاستعادة) — توسم القسم معدلًا
  const setStopMarksDirty = useCallback((updater: SetStateAction<Record<string, string>>) => {
    dirtyRef.current.stopMarks = true;
    setStopMarks(updater);
  }, []);

  // استعادة نسخة احتياطية (دمج مع الحالي بدون فقد)
  const restoreLibrary = useCallback((data: {
    bookmarks?: string[]; highlights?: HighlightItem[]; notes?: Record<string, string>; readLessons?: string[]; stopMarks?: Record<string, string>;
  }) => {
    if (Array.isArray(data.bookmarks)) {
      dirtyRef.current.bookmarks = true;
      setBookmarks((prev) => Array.from(new Set([...prev.map(String), ...data.bookmarks!.map(String)])));
    }
    if (Array.isArray(data.highlights)) {
      dirtyRef.current.highlights = true;
      setHighlights((prev) => {
        const map = new Map(prev.map((h) => [String(h.id ?? h.text), h] as const));
        data.highlights!.forEach((h) => { if (h) map.set(String(h.id ?? h.text), h); });
        return Array.from(map.values());
      });
    }
    if (data.notes && typeof data.notes === 'object') {
      dirtyRef.current.notes = true;
      setNotes((prev) => ({ ...prev, ...data.notes }));
    }
    if (Array.isArray(data.readLessons)) {
      dirtyRef.current.readLessons = true;
      setReadLessons((prev) => Array.from(new Set([...prev.map(String), ...data.readLessons!.map(String)])));
    }
    if (data.stopMarks && typeof data.stopMarks === 'object') {
      // الاستعادة تُغلّب النسخة (كملاحظاتها تمامًا) — وإلا بدت الاستعادة وكأنها لم تفعل شيئًا
      dirtyRef.current.stopMarks = true;
      setStopMarks((prev) => ({ ...prev, ...data.stopMarks }));
    }
  }, []);

  return {
    bookmarks,
    highlights,
    notes,
    readLessons,
    stopMarks,
    setStopMarks: setStopMarksDirty,
    toggleBookmark,
    addHighlight,
    deleteHighlight,
    saveNoteForLesson,
    toggleReadLesson,
    restoreLibrary,
  };
}
