import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage';
import { mergeLibraries, mergeTombs, emptyTombs, cleanTombs, applyTombsToMerged, pruneTombs, dropStaleTombs } from '../utils/mergeLibrary';
import type { TombstoneMap } from '../utils/mergeLibrary';
import { logError } from '../utils/logError';
import { enableFirestoreNetwork } from '../firebase/config';
import type { HighlightItem, UserLibraryData } from '../types';
import {
  syncBookmarks,
  syncHighlights,
  syncAllNotes,
  syncReadLessons,
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
}

export type LibrarySyncState = 'loading' | 'local' | 'offline' | 'pending' | 'syncing' | 'synced' | 'error';

interface LibraryOutbox {
  snapshot: LibrarySnapshot;
  base: LibrarySnapshot;
}

const accountCacheKey = (uid: string): string => `library_v2_${uid}`;
const accountOutboxKey = (uid: string): string => `library_outbox_v2_${uid}`;
const emptyLibrarySnapshot = (): LibrarySnapshot => ({ bookmarks: [], highlights: [], notes: {}, readLessons: [] });

function readLibrarySnapshot(key: string): LibrarySnapshot | null {
  try {
    const parsed = JSON.parse(safeGet(key) || 'null') as Partial<LibrarySnapshot> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks.map(String) : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      readLessons: Array.isArray(parsed.readLessons) ? parsed.readLessons.map(String) : [],
    };
  } catch {
    return null;
  }
}

function readLibraryOutbox(uid: string): LibraryOutbox | null {
  try {
    const parsed = JSON.parse(safeGet(accountOutboxKey(uid)) || 'null') as Partial<LibraryOutbox> | null;
    if (!parsed || !parsed.snapshot || !parsed.base) return null;
    const snapshot = readLibrarySnapshotValue(parsed.snapshot);
    const base = readLibrarySnapshotValue(parsed.base);
    return snapshot && base ? { snapshot, base } : null;
  } catch {
    return null;
  }
}

function readLibrarySnapshotValue(value: unknown): LibrarySnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Partial<LibrarySnapshot>;
  return {
    bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks.map(String) : [],
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    readLessons: Array.isArray(parsed.readLessons) ? parsed.readLessons.map(String) : [],
  };
}

function snapshotsEqual(a: LibrarySnapshot, b: LibrarySnapshot): boolean {
  return (
    strArrEqual(a.bookmarks, b.bookmarks) &&
    highlightsEqual(a.highlights, b.highlights) &&
    mapEqual(a.notes, b.notes) &&
    strArrEqual(a.readLessons, b.readLessons)
  );
}

/**
 * مكتبة المستخدم: المفضلة، الفوائد المقتبسة، الملاحظات، والمسائل المقروءة.
 * تضمن عزل بيانات كل مستخدم بناءً على حسابه.
 * تقوم بدمج بيانات الضيف (إن وجدت) لمرة واحدة عند تسجيل الدخول ثم تحذفها من الجهاز.
 */
export function useUserLibrary() {
  const { user, loadUserData, authLoading } = useAuth();

  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [readLessons, setReadLessons] = useState<string[]>([]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [onlineRevision, setOnlineRevision] = useState(0);
  const lastForcedSyncRevisionRef = useRef(0);
  const [lastSyncRecord, setLastSyncRecord] = useState<{ uid: string; at: number } | null>(null);
  const [syncState, setSyncState] = useState<LibrarySyncState>('loading');
  const isSyncReady = Boolean(user) && isDataLoaded;
  // تتبّع الجلسة لمنع تسرب علامات مستخدم خرج للتو إلى ضيف جديد على نفس الجهاز
  const prevUidRef = useRef<string | null>(null);
  // Avoid exposing the previous account's ready state during the render before its auth effect runs.
  const isLibraryReady = isDataLoaded && loadedUid === (user?.uid ?? null);
  // وسم "معدّل محليًا" لكل قسم — القسم النظيف تُستبدل قيمته بما يصل من الأجهزة الأخرى
  // (فينتشر التعديل والحذف)، والقسم المعدّل يُدمج إضافيًا فقط حمايةً لمسودة المستخدم
  const dirtyRef = useRef({ bookmarks: false, highlights: false, notes: false, readLessons: false });
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
      // المستخدم ضيف أو خرج للتو. بعد الخروج نمسح حالة المكتبة الظاهرة والضيف
      // حتى لا تتحول بيانات الحساب السابق إلى بيانات محلية تُدمج مع حساب لاحق.
      // المعرفات تُوحَّد كنصوص دائمًا حتى لا تفشل المطابقة بين رقم ونص
      const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
      if (prevUidRef.current) {
        // خرج من حساب — لا نعرض بيانات الضيف القديمة ولا نرحّلها لحساب آخر لاحقًا.
        prevUidRef.current = null;
        ['guest_bookmarks', 'guest_highlights', 'guest_notes', 'guest_readLessons']
          .forEach(safeRemove);
        dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false };
        lastWrittenRef.current = null;
        tombRef.current = emptyTombs();
        setBookmarks([]);
        setHighlights([]);
        setNotes({});
        setReadLessons([]);
      } else {
        setBookmarks(asStringArray(readJsonStorage('guest_bookmarks', [])));
        setHighlights(readJsonStorage('guest_highlights', []));
        setNotes(readJsonStorage('guest_notes', {}));
        setReadLessons(asStringArray(readJsonStorage('guest_readLessons', [])));
      }
      // Sync loaded auth/guest state into the hook after the auth transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadedUid(null);
      setIsDataLoaded(true);
      setSyncState('local');
      return;
    }

    // المستخدم مسجل الدخول
    let cancelled = false;
    const previousUid = prevUidRef.current;
    if (previousUid && previousUid !== user.uid) {
      // تبديل مباشر بين حسابين: أخفِ فورًا مكتبة الحساب السابق أثناء جلب الجديدة.
      dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false };
      lastWrittenRef.current = null;
      tombRef.current = emptyTombs();
      setBookmarks([]);
      setHighlights([]);
      setNotes({});
      setReadLessons([]);
    }
    setIsDataLoaded(false);
    prevUidRef.current = user.uid;

    (async () => {
      const queuedOutbox = readLibraryOutbox(user.uid);
      const cachedSnapshot = readLibrarySnapshot(accountCacheKey(user.uid));
      const localSnapshot = queuedOutbox?.snapshot ?? cachedSnapshot;
      if (localSnapshot) {
        // عرض آخر نسخة محلية فورًا بدل انتظار Firestore (قد يصل لـ 12 ثانية على شبكة بطيئة).
        // المكتبة جاهزة للاستخدام من الكاش، والجلب السحابي يكمل في الخلفية ليحدّثها.
        setBookmarks(localSnapshot.bookmarks);
        setHighlights(localSnapshot.highlights);
        setNotes(localSnapshot.notes);
        setReadLessons(localSnapshot.readLessons);
        tombRef.current = loadPersistedTombs(user.uid);
        // إعلان الجاهزية فورًا — المكتبة قابلة للاستخدام من الكاش المحلي
        setLoadedUid(user.uid);
        setIsDataLoaded(true);
      }
      setSyncState(window.navigator.onLine ? 'syncing' : (queuedOutbox ? 'pending' : 'offline'));
      
      // جلب بيانات المستخدم من السحابة بمهلة؛ لا نعلّق واجهة المكتبة للأبد
      // إذا اتصل الجهاز بالواي فاي لكن لم يرد Firestore.
      let cloudFetchTimeout: ReturnType<typeof setTimeout> | null = null;
      const fetchedCloudData = await Promise.race([
        loadUserData(user.uid),
        new Promise<null>((resolve) => {
          cloudFetchTimeout = setTimeout(() => resolve(null), 12_000);
        }),
      ]);
      if (cloudFetchTimeout) clearTimeout(cloudFetchTimeout);
      const cloudData: UserLibraryData = fetchedCloudData || {
        bookmarks: [],
        highlights: [],
        notes: {},
        readLessons: [],
        visits: [],
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

      const serverSnapshot: LibrarySnapshot = {
        bookmarks: cloudData.bookmarks || [],
        highlights: cloudData.highlights || [],
        notes: cloudData.notes || {},
        readLessons: cloudData.readLessons || [],
      };
      const fallbackSnapshot = queuedOutbox?.snapshot ?? (!fetchedCloudData ? cachedSnapshot : null);

      const hasGuestData =
        guestBookmarks.length > 0 ||
        guestHighlights.length > 0 ||
        Object.keys(guestNotes).length > 0 ||
        guestReadLessons.length > 0;

      let initialBookmarks = fallbackSnapshot?.bookmarks ?? serverSnapshot.bookmarks;
      let initialHighlights = fallbackSnapshot?.highlights ?? serverSnapshot.highlights;
      let initialNotes = fallbackSnapshot?.notes ?? serverSnapshot.notes;
      let initialReadLessons = fallbackSnapshot?.readLessons ?? serverSnapshot.readLessons;

      // رفع بيانات الضيف المدمجة — الحذف من الجهاز فقط بعد نجاح الرفع
      let mergeUploaded = Boolean(fetchedCloudData) && !hasGuestData && !queuedOutbox; // لا نعلن النجاح إذا تعذر جلب السحابة أو بقيت تغييرات محلية
      if (hasGuestData) {
        const merged = mergeLibraries(
          {
            bookmarks: initialBookmarks,
            highlights: initialHighlights,
            notes: initialNotes,
            readLessons: initialReadLessons,
          },
          {
            bookmarks: guestBookmarks,
            highlights: guestHighlights,
            notes: guestNotes,
            readLessons: guestReadLessons,
          },
        );
        // إسقاط المشهود بحذفه — إلا ما أعاده الضيف صراحةً (الوجود يلغي الشاهد)
        const guestLocal = {
          bookmarks: guestBookmarks,
          highlights: guestHighlights,
          notes: guestNotes,
          readLessons: guestReadLessons,
        };
        const dropped = applyTombsToMerged(merged, guestLocal, tombRef.current);
        initialBookmarks = dropped.bookmarks;
        initialHighlights = dropped.highlights;
        initialNotes = dropped.notes;
        initialReadLessons = dropped.readLessons;
        tombRef.current = pruneTombs(tombRef.current, {
          bookmarks: initialBookmarks,
          highlights: initialHighlights,
          notes: initialNotes,
          readLessons: initialReadLessons,
        });
        persistTombs(user.uid);
        try {
          await Promise.all([
            syncBookmarks(user.uid, initialBookmarks),
            syncHighlights(user.uid, initialHighlights),
            syncAllNotes(user.uid, initialNotes),
            syncReadLessons(user.uid, initialReadLessons),
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

      const initialSnapshot = {
        bookmarks: initialBookmarks,
        highlights: initialHighlights,
        notes: initialNotes,
        readLessons: initialReadLessons,
      };
      // آخر كتابة ناجحة تُسجَّل فقط عند تطابق السحابة فعليًا — الفشل يُبقي الباب مفتوحًا لإعادة الرفع
      lastWrittenRef.current = mergeUploaded
        ? initialSnapshot
        : queuedOutbox?.base ?? (fetchedCloudData ? serverSnapshot : cachedSnapshot ?? (!hasGuestData ? initialSnapshot : null));
      dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false };

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

      // إذا لم يسبق إعلان الجاهزية (لا كاش محلي) نُعلنها الآن بعد الجلب السحابي
      setLoadedUid(user.uid);
      setIsDataLoaded(true);
      const onlineNow = window.navigator.onLine;
      setSyncState(queuedOutbox ? 'pending' : !onlineNow ? 'offline' : mergeUploaded || fetchedCloudData ? 'synced' : 'pending');
      // فشل الجلب الأولي (تهيئة Firestore باردة/شبكة بطيئة) أو وُجد صندوق صادر:
      // نُطلق آليات إعادة المزامنة فورًا بدل ترك المؤشر عالقًا حتى التحديث اليدوي.
      if (onlineNow && (!fetchedCloudData || queuedOutbox)) {
        setOnlineRevision((revision) => revision + 1);
      }
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // حفظ لقطة محلية لكل حساب وضيف؛ تبقى القراءة والتعديلات متاحة بعد إغلاق التطبيق أو انقطاع الشبكة.
  useEffect(() => {
    if (!isDataLoaded) return;
    const snapshot = { bookmarks, highlights, notes, readLessons };
    if (!user) {
      safeSet('guest_bookmarks', JSON.stringify(bookmarks));
      safeSet('guest_highlights', JSON.stringify(highlights));
      safeSet('guest_notes', JSON.stringify(notes));
      safeSet('guest_readLessons', JSON.stringify(readLessons));
    } else if (loadedUid === user.uid) {
      safeSet(accountCacheKey(user.uid), JSON.stringify(snapshot));
    }
  }, [bookmarks, highlights, notes, readLessons, user, loadedUid, isDataLoaded]);

  // المزامنة مع السحابة دفعة واحدة بعد هدوء التغييرات (تجنّب كتابة لكل ضغطة متتالية)
  // مهلة قصيرة (250ms) تكفي لدمج النقرات المزدوجة مع استجابة أسرع.
  // دمج عند الكتابة: تُقرأ النسخة الأحدث وتُدمج قبل الرفع فلا تمحو تعديلات جهاز آخر.
  // تطابق الحالة مع آخر كتابة ناجحة = لا جديد (يمنع الرفع الصدى بعد استبدال قادم من مستمع).
  // diff-first: مفاتيح اختفت منذ آخر كتابة = حذف عمدًا (شاهد)، ومفاتيح عادت = إلغاء الشاهد.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncErrorRef = useRef(false);
  const syncStateRef = useRef(syncState);
  const lastRecoveryAttemptRef = useRef(0);
  // عدّاد فشل المستمع المتتالي — نؤجّل إظهار 'error' حتى يتكرر الفشل فعلًا،
  // فلا تظهر "تعذرت مزامنة المكتبة" عند اهتزاز شبكة عابر أثناء التهيئة الباردة.
  const listenFailuresRef = useRef(0);
  // Keep a current view for browser lifecycle callbacks without reinstalling listeners.
  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);
  useEffect(() => {
    let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
    const retryPendingSync = () => {
      // لا نعتمد على navigator.onLine وحده: قد يبقى false بعد عودة الشبكة في PWA،
      // والمحاولة الفعلية هي الحكم. نجبر Firestore على إعادة الاتصال أولًا.
      void enableFirestoreNetwork();
      const state = syncStateRef.current;
      // A live sync already has its own request and watchdog. Recover only a queued,
      // offline, or failed sync so foreground events never create duplicate transactions.
      if (state !== 'pending' && state !== 'offline' && state !== 'error') return;
      if (Date.now() - lastRecoveryAttemptRef.current < 8_000) return;
      lastRecoveryAttemptRef.current = Date.now();
      if (recoveryTimer) clearTimeout(recoveryTimer);
      recoveryTimer = setTimeout(() => {
        setOnlineRevision((revision) => revision + 1);
      }, 200);
    };
    const retryWhenVisible = () => {
      if (document.visibilityState === 'visible') retryPendingSync();
    };

    window.addEventListener('online', retryPendingSync);
    window.addEventListener('pageshow', retryPendingSync);
    window.addEventListener('focus', retryPendingSync);
    document.addEventListener('visibilitychange', retryWhenVisible);
    return () => {
      if (recoveryTimer) clearTimeout(recoveryTimer);
      window.removeEventListener('online', retryPendingSync);
      window.removeEventListener('pageshow', retryPendingSync);
      window.removeEventListener('focus', retryPendingSync);
      document.removeEventListener('visibilitychange', retryWhenVisible);
    };
  }, []);

  const retryLibrarySync = useCallback(() => {
    // زر يدوي: لا نحجب المحاولة بحجة navigator.onLine (كثيرًا ما يكون خاطئًا بعد العودة).
    // إن كانت الشبكة مقطوعة فعلًا فسيفشل الطلب ويبقى الصندوق الصادر محفوظًا.
    void enableFirestoreNetwork();
    // إعادة محاولة يدوية = بداية نظيفة: لا نُظهر 'error' من عدّاد فشل قديم قبل أن تفشل المحاولة الجديدة.
    listenFailuresRef.current = 0;
    if (isSyncReady && user) {
      syncErrorRef.current = false;
      setSyncState('syncing');
    }
    setOnlineRevision((revision) => revision + 1);
  }, [isSyncReady, user]);

  useEffect(() => {
    if (!isSyncReady || !user) return;
    let requestTimeout: ReturnType<typeof setTimeout> | null = null;
    const uid = user.uid;
    const snapshot = { bookmarks, highlights, notes, readLessons };
    // رجوع الاتصال أو الضغط على «إعادة المزامنة» يجب أن ينفّذ معاملة سحابية فعلية،
    // حتى عندما تطابق البيانات المحلية آخر نسخة معروفة؛ إعادة فتح المستمع وحدها
    // قد تترك حالة التحذير عالقة بلا طلب كتابة/تأكيد جديد.
    const forceCloudSync = onlineRevision > lastForcedSyncRevisionRef.current;
    if (forceCloudSync) lastForcedSyncRevisionRef.current = onlineRevision;
    if (lastWrittenRef.current && snapshotsEqual(snapshot, lastWrittenRef.current) && !forceCloudSync) {
      // لا جديد للرفع — لكن قد يكون صندوق صادر قديم عالقًا من جلسة سابقة اكتمل رفعها فعليًا.
      // تركه يمنع المستمع اللحظي من تطبيق تعديلات الأجهزة الأخرى ويُبقي المؤشر "قيد المزامنة".
      // بما أن المحلي يطابق آخر كتابة ناجحة فلا شيء لرفعه؛ ننظّفه فقط.
      if (readLibraryOutbox(uid)) {
        safeRemove(accountOutboxKey(uid));
        syncErrorRef.current = false;
      }
      // المحلي يطابق ما كُتب بنجاح بالفعل = مزامنة مؤكدة. بدون هذه السطر يبقى المؤشر
      // على 'syncing' للأبد: لا طلب يُرسل (فلا انتقال)، ولا لقطة جديدة تصل (فلا تأكيد).
      // الحارس على syncStateRef يمنع تحديث "آخر مزامنة" مع كل تمريرة بلا تغيير فعلي.
      if (syncStateRef.current !== 'synced') {
        setSyncState('synced');
        setLastSyncRecord({ uid, at: Date.now() });
      }
      return;
    }
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
      persistTombs(uid);
    }
    const tombs = tombRef.current;
    // base للدمج الثلاثي: آخر حالة مكتوبة بنجاح (غيابها = أول رفع: كل المحلي جديد)
    const base = lastWrittenRef.current ?? emptyLibrarySnapshot();
    // لقطة أقسام المستخدم المعدّلة قبل بدء هذه المعاملة — تُستخدم عند محاذاة النتيجة
    // حتى لا نمحو مسودةً أنشأها المستخدم أثناء انتظار استجابة الخادم.
    const dirtyAtRequest = { ...dirtyRef.current };
    // صندوق صادر دائم: ينجو من إغلاق التطبيق أو إعادة تشغيل الهاتف قبل عودة الإنترنت.
    safeSet(accountOutboxKey(uid), JSON.stringify({ snapshot, base } satisfies LibraryOutbox));
    syncErrorRef.current = false;
    setSyncState('pending');
    if (syncTimer.current) clearTimeout(syncTimer.current);
    let cancelled = false;
    syncTimer.current = setTimeout(() => {
      // المحاولة اليدوية/العودة للتركيز تتجاوز حارس navigator.onLine الخاطئ؛
      // الطلب نفسه هو الحكم، وأي فشل يُبقي التغييرات في الصندوق الصادر.
      if (!window.navigator.onLine && !forceCloudSync) {
        setSyncState('pending');
        return;
      }
      void enableFirestoreNetwork();
      setSyncState('syncing');
      // لا نترك المؤشر عالقًا للأبد إذا لم يرد Firestore؛ تبقى المسودة في
      // الصندوق المحلي ويستطيع المستخدم إعادة المحاولة بأمان.
      requestTimeout = setTimeout(() => {
        if (cancelled || prevUidRef.current !== uid) return;
        syncErrorRef.current = true;
        // 'pending' لا 'error': المسودة محفوظة في الصندوق وتُرفع تلقائيًا لاحقًا؛
        // إظهار "تعذرت المزامنة" لمجرد بطء استجابة Firestore يقلق المستخدم بلا داعٍ.
        setSyncState('pending');
      }, 20_000);
      mergeAndSyncLibrary(uid, snapshot, base, tombs)
        .then(({ data, tombs }) => {
          if (requestTimeout) clearTimeout(requestTimeout);
          // حارس تبديل الحساب/الإلغاء: نتيجة حساب سابق لا تلوّث حالة/مرجع حساب آخر
          if (cancelled || prevUidRef.current !== uid) return;
          syncErrorRef.current = false;
          tombRef.current = tombs;
          persistTombs(uid);
          lastWrittenRef.current = data;
          safeSet(accountCacheKey(uid), JSON.stringify(data));
          const currentOutbox = readLibraryOutbox(uid);
          if (currentOutbox && snapshotsEqual(currentOutbox.snapshot, snapshot)) safeRemove(accountOutboxKey(uid));
          dirtyRef.current = { bookmarks: false, highlights: false, notes: false, readLessons: false };
          // محاذاة: الدمج قد يغلّب السحابة (عناصر رفعها جهاز آخر) على الحالة المحلية —
          // نعكس النتيجة كاملةً على الحالة حتى لا يبقى الجهاز معروضًا على نسخته فقط.
          // هذا هو المسار الذي يجعل تعديلات الأجهزة الأخرى تظهر بعد اكتمال الرفع،
          // لأن المستمع اللحظي يتجاهل اللقطات ما دام الصندوق الصادر موجودًا ثم لا تأتي لقطة جديدة.
          // الأقسام التي عدّلها المستخدم أثناء الطلب تُدمج (اتحاد) لا تُستبدل، حمايةً لمسودته.
          setBookmarks((prev) => {
            const next = dirtyAtRequest.bookmarks
              ? Array.from(new Set([...prev.map(String), ...data.bookmarks.map(String)]))
              : data.bookmarks.map(String);
            return strArrEqual(prev, next) ? prev : next;
          });
          setReadLessons((prev) => {
            const next = dirtyAtRequest.readLessons
              ? Array.from(new Set([...prev.map(String), ...data.readLessons.map(String)]))
              : data.readLessons.map(String);
            return strArrEqual(prev, next) ? prev : next;
          });
          setHighlights((prev) => {
            const next = dirtyAtRequest.highlights
              ? (() => {
                  const map = new Map(prev.map((h) => [String(h.id ?? h.text), h] as const));
                  data.highlights.forEach((h) => { if (h) map.set(String(h.id ?? h.text), h); });
                  return Array.from(map.values());
                })()
              : data.highlights;
            return highlightsEqual(prev, next) ? prev : next;
          });
          setNotes((prev) => {
            const next = dirtyAtRequest.notes ? { ...data.notes, ...prev } : data.notes;
            return mapEqual(prev, next) ? prev : next;
          });
          setSyncState('synced');
          setLastSyncRecord({ uid, at: Date.now() });
        })
        .catch((e) => {
          if (requestTimeout) clearTimeout(requestTimeout);
          if (cancelled || prevUidRef.current !== uid) return;
          logError('userLibrary.sync', e, { section: 'merge' });
          syncErrorRef.current = true;
          // الصندوق الصادر يحفظ التغييرات؛ نُبقي 'pending' فيُعاد الرفع تلقائيًا عند عودة
          // التركيز/الاتصال بدل إظهار فشل دائم لخطأ شبكة عابر أثناء التهيئة الباردة.
          setSyncState('pending');
        });
    }, 250);
    return () => {
      cancelled = true;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      if (requestTimeout) clearTimeout(requestTimeout);
    };
  }, [bookmarks, highlights, notes, readLessons, isSyncReady, user, persistTombs, onlineRevision]);

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
        unsub = fsMod.onSnapshot(colRef, { includeMetadataChanges: true }, (snap) => {
          listenFailuresRef.current = 0;
          const cloud: { bookmarks: string[]; highlights: HighlightItem[]; notes: Record<string, string>; readLessons: string[] } =
            { bookmarks: [], highlights: [], notes: {}, readLessons: [] };
          let cloudTombs: unknown = null;
          snap.forEach((d) => {
            const v = d.data() as Record<string, unknown>;
            if (d.id === 'bookmarks' && Array.isArray(v.items)) cloud.bookmarks = (v.items as unknown[]).map(String);
            else if (d.id === 'highlights' && Array.isArray(v.items)) cloud.highlights = v.items as HighlightItem[];
            else if (d.id === 'notes' && v.notes && typeof v.notes === 'object') cloud.notes = v.notes as Record<string, string>;
            else if (d.id === 'readLessons' && Array.isArray(v.items)) cloud.readLessons = (v.items as unknown[]).map(String);
            else if (d.id === 'tombstones' && v.tombs && typeof v.tombs === 'object') cloudTombs = v.tombs;
          });

          // لا تستبدل المسودة المحفوظة في الصندوق بلقطة كاش أقدم؛ المعاملة ستدمجها مع أحدث نسخة خادمية.
          // لكن صندوقًا بلا فرق فعلي (لقطته تساوي أساسه = لا شيء للرفع) لا يحجب اللقطات —
          // وإلا بقي المستمع أعمى عن تعديلات الأجهزة الأخرى إلى الأبد إن عُلّق الصندوق.
          const outbox = readLibraryOutbox(user.uid);
          const outboxHasPending = Boolean(outbox && !snapshotsEqual(outbox.snapshot, outbox.base));
          if (outbox && !outboxHasPending) safeRemove(accountOutboxKey(user.uid));
          if (outboxHasPending) {
            // يوجد رفع مؤجّل: 'pending' (بانتظار الرفع) لا 'syncing'. 'syncing' تعني طلبًا
            // جاريًا الآن؛ إبقاؤها هنا كان يجعل مؤشر المزامنة يدور بلا نهاية لأن اللقطة
            // الخادمية لا تتغيّر فلا تأتي لقطة تالية تُصحّح الحالة.
            setSyncState('pending');
            return;
          }

          // شواهد السحابة تُحدَّث لحظيًا أيضًا — لا تُقرأ عند الدخول فقط.
          // ثم نُسقط الشواهد "العالقة": شاهد يعيق عنصرًا ما زال في السحابة = بلا أساس
          // (أُلغيت إعادته من جهاز آخر) — بدونه يستمر الجهاز بإسقاط الوارد ثم يعيد
          // تسجيل حذفه ويدمّر ما رفعه الآخر: بالضبط علامة التوقف "التي لا تنتقل".
          if (cloudTombs) {
            tombRef.current = mergeTombs(tombRef.current, cleanTombs(cloudTombs));
          }
          tombRef.current = dropStaleTombs(tombRef.current, cloud);
          persistTombs(user.uid);

          // حدّث الحالة من ميتاداتا الاتصال حتى لو كانت البيانات مطابقة محليًا؛
          // حارس منع الصدى أدناه قد يتجاهل محتوى اللقطة لكنه لا يجب أن يتجاهل تأكيد الخادم.
          if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
            setSyncState('synced');
            setLastSyncRecord({ uid: user.uid, at: Date.now() });
          } else if (snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
            setSyncState(readLibraryOutbox(user.uid) ? 'pending' : 'offline');
          }

          // منع حلقة الصدى: إذا كانت البيانات القادمة من السحابة مطابقة لما كتبناه للتو، نتجاهلها
          if (lastWrittenRef.current && snapshotsEqual(cloud, lastWrittenRef.current)) {
            safeSet(accountCacheKey(user.uid), JSON.stringify(cloud));
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

        }, (error) => {
          if (cancelled) return;
          logError('userLibrary.listen', error, { section: 'snapshot' });
          listenFailuresRef.current += 1;
          // خطأ عابر (تهيئة باردة/شبكة) لا يُعد "تعذرت المزامنة"؛ نبقى 'pending' في المحاولات الأولى
          // ويكفل المشترك (online/focus/visibility) إعادة الاشتراك. 'error' فقط عند تكرار الفشل.
          setSyncState(
            !window.navigator.onLine
              ? 'offline'
              : listenFailuresRef.current >= 3 ? 'error' : 'pending',
          );
        });
      } catch {
        // بلا اتصال: يبقى الجلب عند الدخول هو المصدر — لا كسر
      }
    })();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, [user, isSyncReady, persistTombs, onlineRevision]);

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
    setNotes((prev) => {
      const next = { ...prev };
      if (!text.trim()) {
        delete next[key];
      } else {
        next[key] = text;
      }
      return next;
    });
  }, []);

  const toggleReadLesson = useCallback((lessonId: string | number) => {
    dirtyRef.current.readLessons = true;
    setReadLessons((prev) =>
      prev.includes(String(lessonId))
        ? prev.filter((id) => id !== String(lessonId))
        : [...prev, String(lessonId)]
    );
  }, []);

  // استعادة نسخة احتياطية (دمج مع الحالي بدون فقد)
  const restoreLibrary = useCallback((data: {
    bookmarks?: string[]; highlights?: HighlightItem[]; notes?: Record<string, string>; readLessons?: string[];
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
  }, []);

  return {
    isDataLoaded: isLibraryReady,
    lastSyncedAt: lastSyncRecord && lastSyncRecord.uid === user?.uid ? lastSyncRecord.at : null,
    syncState,
    retryLibrarySync,
    bookmarks,
    highlights,
    notes,
    readLessons,
    toggleBookmark,
    addHighlight,
    deleteHighlight,
    saveNoteForLesson,
    toggleReadLesson,
    restoreLibrary,
  };
}
