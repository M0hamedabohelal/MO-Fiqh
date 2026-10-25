import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';
import { logError } from '../utils/logError';
import { safeGet, safeSet, safeParse } from '../utils/safeStorage';
import {
  cloudEnabled,
  libraryDocPath,
  librarySignature,
  mergeLibraries,
  KEYS,
  byId,
  pruneTombstones,
  isSyncDisabled,
  setSyncDisabled,
  subscribeSyncDisabled,
} from '../utils/librarySync';
import type { SyncableLibrary } from '../utils/librarySync';
import type { HighlightItem } from '../types';
import type { StopMarkMap } from '../features/stopMarks/model';

// ─── مزامنة مكتبة المستخدم مع السحابة (حيّة بين الأجهزة) ───
//
// التصميم:
//   1) مستمع `onSnapshot` دائم على مستند المكتبة — يصل التعديل من أي جهاز فورًا.
//      (النسخة الأولى سحبت مرة واحدة عند الإقلاع فقط، فلم يرَ اللابتوب ما أُضيف من
//      الفون بعد فتحه — وهو سبب «مش حاسس بالمزامنة».)
//   2) دمج (mergeLibraries) لا استبدال، مع طابع زمني لكل مفتاح يحسم التعارض.
//   3) كتابة debounced عند تغيّر التوقيع فقط.
//
// ⚠️ حلقة الكتابة: المستمع يشتعل بعد كل كتابة نكتبها نحن. الحارس هنا ثلاثي:
//   - `lastPushedRef`: إن كان توقيع اللقطة السحابية هو آخر ما كتبناه، لا دمج ولا كتابة.
//   - `pendingPushSignatureRef`: توقيع الدفعة الجاري رفعها يبتلع صدى كتابتنا فور صدوره بدقة متناهية.
//   - `applyingRef`: أثناء تطبيق دمج على الحالة المحلية نمنع إطلاق دفعة جديدة، ونؤجل اللقطات الواردة.
// بدون هذه الحمايات تتحول المزامنة إلى كتابة/لقطة لا نهائية.

// تأخير سريع للإجراءات المنفردة (المفضلة، القراءة، علامات الوقف، الفوائد، الثيم)
// 300ms يضمن سرعة فائقة تبدو لحظية بين الأجهزة مع دمج النقرات السريعة المتتالية
const FAST_SYNC_DEBOUNCE_MS = 300;
// تأخير كتابة الملاحظات أثناء الكتابة اليدوية لمنع الإجهاد مع كل حرف
const NOTE_SYNC_DEBOUNCE_MS = 1000;
// نافذة تطبيق الدمج المحلي (250ms تمنح React متسعًا للاستقرار وتمنع الدورات الزائدة)
const APPLYING_WINDOW_MS = 250;

export interface LibrarySyncInput {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  stopMarks: StopMarkMap;
  theme: string;
}

interface UseLibrarySyncArgs {
  /** هل انتهى تحميل البيانات المحلية؟ لا مزامنة قبلها */
  ready: boolean;
  data: LibrarySyncInput;
  /** تطبيق نتيجة الدمج على الحالة المحلية */
  onMerged: (merged: LibrarySyncInput) => void;
}

export function useLibrarySync({ ready, data, onMerged }: UseLibrarySyncArgs): void {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const stampsStorageKey = (u: string) => `library_stamps_v1_${u}`;
  const stampsRef = useRef<Record<string, number>>({});
  const currentUidRef = useRef<string | null>(uid);

  const syncDisabled = useSyncExternalStore(
    subscribeSyncDisabled,
    () => isSyncDisabled(uid),
    () => false,
  );

  // تحميل الأختام الزمنية المحلية عند معرفة المستخدم
  useEffect(() => {
    if (uid) {
      stampsRef.current = safeParse<Record<string, number>>(safeGet(stampsStorageKey(uid)), {});
    } else {
      stampsRef.current = {};
    }
  }, [uid]);

  // آخر توقيع كتبناه — يقطع حلقة الكتابة ويوفّر كتابات زائدة
  const lastPushedRef = useRef<string>('');
  // توقيع الدفعة الجاري رفعها حاليًا — لابتلاع الصدى اللحظي قبل اكتمال تأكيد الخادم
  const pendingPushSignatureRef = useRef<string>('');
  // لقطة سحابية وردت أثناء تطبيق دمج محلي — تُحفظ لتُطبّق فور انتهاء نافذة التطبيق بدلاً من إسقاطها
  const pendingSnapshotRef = useRef<Partial<SyncableLibrary> | null | undefined>(undefined);
  // هل نطبّق دمجًا الآن؟ (منع إطلاق دفعة أثناء التطبيق)
  const applyingRef = useRef<boolean>(false);
  // هل توجد عملية دفع جارية الآن؟
  const pushingRef = useRef<boolean>(false);
  // عداد محاولات إعادة الدفع عند الفشل (لتطبيق التراجع الأسي والتوقف بعد سقف محدد)
  const retryCountRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMergedRef = useRef(onMerged);
  const dataRef = useRef(data);
  const mergeAndApplyRef = useRef<(raw: Partial<SyncableLibrary> | null) => void>(() => {});
  const schedulePushRef = useRef<() => void>(() => {});
  // إبقاء المراجع محدثة بدون إعادة تشغيل الآثار
  useEffect(() => { onMergedRef.current = onMerged; }, [onMerged]);
  useEffect(() => { dataRef.current = data; }, [data]);

  const toSyncable = (src: LibrarySyncInput, stamps: Record<string, number>): SyncableLibrary => ({
    bookmarks: src.bookmarks.map(String),
    highlights: src.highlights,
    notes: src.notes,
    readLessons: src.readLessons.map(String),
    updatedAt: stamps,
    theme: src.theme ?? 'dark',
    stopMarks: src.stopMarks,
  });

  const previousDataRef = useRef<SyncableLibrary>(toSyncable(data, {}));

  // عزل الحسابات عند تبديل المستخدم في نفس التبويب: تصفير المراجع السابقة لمنع تلوث شواهد الحذف
  useEffect(() => {
    if (currentUidRef.current !== uid) {
      currentUidRef.current = uid;
      lastPushedRef.current = '';
      pendingPushSignatureRef.current = '';
      pendingSnapshotRef.current = undefined;
      previousDataRef.current = toSyncable(dataRef.current, {});
      retryCountRef.current = 0;
      pushingRef.current = false;
      applyingRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [uid]);

  const mergeAndApply = useCallback((cloudRaw: Partial<SyncableLibrary> | null): void => {
    const local = toSyncable(dataRef.current, stampsRef.current);
    if (!cloudRaw) {
      if (isSyncDisabled(uid)) {
        lastPushedRef.current = '';
        return;
      }
      // إذا حُذف المستند سحابيًا وكان الحساب متزامنًا بالفعل، فهذا حذف صريح لحق النسيان
      // نعطل المزامنة لحماية قرار الحذف ومنع إحيائه تلقائيًا
      if (Object.keys(stampsRef.current).length > 0 && lastPushedRef.current !== '') {
        if (uid) setSyncDisabled(uid, true);
        lastPushedRef.current = '';
        return;
      }
      // لا شيء سحابيًا بعد (حساب جديد لم يسبق له المزامنة): ارفع المحلي كأساس أول
      lastPushedRef.current = '';
      return;
    }

    // صدى كتابتنا نحن: التوقيع السحابي = آخر ما كتبناه أو ما ندفعه حاليًا → لا شيء نفعله
    const cloud = toSyncable(
      {
        bookmarks: (cloudRaw.bookmarks ?? []) as string[],
        highlights: (cloudRaw.highlights ?? []) as HighlightItem[],
        notes: (cloudRaw.notes ?? {}) as Record<string, string>,
        readLessons: (cloudRaw.readLessons ?? []) as string[],
        stopMarks: (cloudRaw.stopMarks ?? {}) as StopMarkMap,
        theme: typeof cloudRaw.theme === 'string' ? cloudRaw.theme : local.theme ?? 'dark',
      },
      cloudRaw.updatedAt ?? {},
    );

    const cloudSignature = librarySignature(cloud);
    if (cloudSignature === lastPushedRef.current || cloudSignature === pendingPushSignatureRef.current) {
      return;
    }

    const merged: SyncableLibrary = mergeLibraries(cloud, local);
    const localSignature = librarySignature(local);
    const mergedSignature = librarySignature(merged);

    // حفظ وتحديث الأختام المدمجة محليًا مع تقليم الشواهد القديمة
    const cleanStamps = pruneTombstones(merged.updatedAt ?? {}, merged);
    stampsRef.current = cleanStamps;
    if (uid) safeSet(stampsStorageKey(uid), JSON.stringify(cleanStamps));

    if (mergedSignature !== localSignature) {
      applyingRef.current = true;
      lastPushedRef.current = mergedSignature;
      onMergedRef.current({
        bookmarks: merged.bookmarks,
        highlights: merged.highlights,
        notes: merged.notes,
        readLessons: merged.readLessons,
        stopMarks: (merged.stopMarks ?? {}) as StopMarkMap,
        theme: merged.theme ?? (local.theme as string) ?? 'dark',
      });
      // نترك التطبيق يكتمل في React (250ms كافية جدًا) ثم نستهلك أي لقطة وردت أثناء المعالجة
      setTimeout(() => {
        applyingRef.current = false;
        if (pendingSnapshotRef.current !== undefined) {
          const queued = pendingSnapshotRef.current;
          pendingSnapshotRef.current = undefined;
          mergeAndApplyRef.current(queued);
        }
      }, APPLYING_WINDOW_MS);
    } else {
      lastPushedRef.current = mergedSignature;
      applyingRef.current = false;
    }
  }, [uid]);
  useEffect(() => { mergeAndApplyRef.current = mergeAndApply; }, [mergeAndApply]);

  // 1) مستمع حيّ على مستند المكتبة — يصل تعديل كل الأجهزة فورًا
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || syncDisabled || !isFirebaseConfigured) return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      try {
        const [{ getFirestore }, fs] = await Promise.all([
          import('../firebase/config'),
          import('firebase/firestore'),
        ]);
        const { db } = await getFirestore();
        if (cancelled) return;
        const ref = fs.doc(db, libraryDocPath(uid));
        unsubscribe = fs.onSnapshot(
          ref,
          (snap) => {
            if (cancelled) return;
            const raw = snap.exists() ? (snap.data() as Partial<SyncableLibrary>) : null;
            if (applyingRef.current) {
              pendingSnapshotRef.current = raw;
              return;
            }
            mergeAndApply(raw);
          },
          (error) => {
            // رفض الصلاحيات ليس عطلًا: التطبيق يعمل محليًا بالكامل
            if (!cancelled) logError('library.sync.listen', error);
          },
        );
      } catch (error) {
        if (!cancelled) logError('library.sync.listen', error);
      }
    })();

    return () => {
      cancelled = true;
      try { unsubscribe?.(); } catch { /* ignore */ }
    };
  }, [ready, uid, syncDisabled, mergeAndApply]);

  // 2) الدفع عند تغيّر المحتوى — ذكي ومتكيف (300ms للمهام السريعة، 1000ms للملاحظات)
  const schedulePush = useCallback(() => {
    if (!cloudEnabled(uid)) return;

    // أثناء تطبيق دمج أو دفع جارٍ لا نُسقط الدفعة بل نُعيد جدولتها سريعًا (200ms)
    if (applyingRef.current || pushingRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => schedulePushRef.current(), 200);
      return;
    }

    const payload = toSyncable(dataRef.current, {});
    const signature = librarySignature(payload);
    if (signature === lastPushedRef.current) return;

    pushingRef.current = true;
    pendingPushSignatureRef.current = signature;

    void (async () => {
      try {
        const [{ getFirestore }, fs] = await Promise.all([
          import('../firebase/config'),
          import('firebase/firestore'),
        ]);
        const { db } = await getFirestore();
        // updatedAt: طابع زمني لكل مفتاح قابل للاستبدال أو الحذف — أساس حلّ التعارض
        const now = Date.now();
        const prev = previousDataRef.current;
        const stamps: Record<string, number> = { ...stampsRef.current };

        // أختام الملاحظات الحالية (المعدلة/الجديدة) والمحذوفة حديثًا
        Object.entries(payload.notes).forEach(([id, text]) => {
          const key = KEYS.note(id);
          if (prev.notes[id] !== text || !(key in stamps)) {
            stamps[key] = now;
          }
        });
        Object.keys(prev.notes ?? {}).forEach((id) => {
          if (!(id in payload.notes)) stamps[KEYS.note(id)] = now;
        });

        // أختام الفوائد الحالية والمحذوفة حديثًا
        payload.highlights.forEach((h: HighlightItem) => {
          const hid = byId(h);
          const key = KEYS.highlight(hid);
          if (!prev.highlights.some((curr) => byId(curr) === hid) || !(key in stamps)) {
            stamps[key] = now;
          }
        });
        (prev.highlights ?? []).forEach((h: HighlightItem) => {
          const hid = byId(h);
          if (!payload.highlights.some((curr) => byId(curr) === hid)) {
            stamps[KEYS.highlight(hid)] = now;
          }
        });

        // أختام المفضلة الحالية (الجديدة) والمحذوفة حديثًا (حذف المفضلة يصبح قابلاً للنشر)
        payload.bookmarks.forEach((id: string) => {
          const key = KEYS.bookmark(id);
          if (!prev.bookmarks.includes(id) || !(key in stamps)) {
            stamps[key] = now;
          }
        });
        (prev.bookmarks ?? []).forEach((id: string | number) => {
          const bid = String(id);
          if (!payload.bookmarks.includes(bid)) {
            stamps[KEYS.bookmark(bid)] = now;
          }
        });

        // أختام المسائل المقروءة الحالية (الجديدة) والمحذوفة حديثًا
        payload.readLessons.forEach((id: string) => {
          const key = KEYS.read(id);
          if (!prev.readLessons.includes(id) || !(key in stamps)) {
            stamps[key] = now;
          }
        });
        (prev.readLessons ?? []).forEach((id: string | number) => {
          const rid = String(id);
          if (!payload.readLessons.includes(rid)) {
            stamps[KEYS.read(rid)] = now;
          }
        });

        if (payload.theme !== prev.theme || !(KEYS.theme in stamps)) {
          stamps[KEYS.theme] = now;
        }

        const cleanStamps = pruneTombstones(stamps, payload, now);

        await fs.setDoc(
          fs.doc(db, libraryDocPath(uid)),
          {
            bookmarks: payload.bookmarks,
            highlights: payload.highlights,
            notes: payload.notes,
            readLessons: payload.readLessons,
            stopMarks: payload.stopMarks ?? {},
            theme: payload.theme,
            updatedAt: cleanStamps,
          },
        );

        // نجحت الكتابة: الآن فقط نعتمد الحالة السابقة والأختام وآخر توقيع
        previousDataRef.current = payload;
        lastPushedRef.current = signature;
        pendingPushSignatureRef.current = '';
        stampsRef.current = cleanStamps;
        retryCountRef.current = 0;
        if (uid) safeSet(stampsStorageKey(uid), JSON.stringify(cleanStamps));
      } catch (error) {
        logError('library.sync.push', error);
        // في حال فشل الكتابة (أوفلاين/حصة): لا نقدّم previousDataRef حتى تظل المحذوفات محفوظة
        lastPushedRef.current = '';
        pendingPushSignatureRef.current = '';

        // تراجع أسي بسقف محدد (4s -> 8s -> 16s -> 32s -> 60s) مع توقف بعد 5 محاولات
        if (retryCountRef.current < 5) {
          const delay = Math.min(4000 * Math.pow(2, retryCountRef.current), 60000);
          retryCountRef.current += 1;
          timerRef.current = setTimeout(() => schedulePushRef.current(), delay);
        } else {
          // التوقف بعد 5 محاولات متتالية لمنع استهلاك البطارية حتى يطرأ تعديل جديد
          retryCountRef.current = 0;
        }
      } finally {
        pushingRef.current = false;
      }
    })();
  }, [uid]);
  useEffect(() => { schedulePushRef.current = schedulePush; }, [schedulePush]);

  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || syncDisabled || !isFirebaseConfigured) return undefined;

    const prevNotes = previousDataRef.current.notes;
    const currentNotes = data.notes;
    const isNotesEdit = JSON.stringify(prevNotes) !== JSON.stringify(currentNotes);
    const delay = isNotesEdit ? NOTE_SYNC_DEBOUNCE_MS : FAST_SYNC_DEBOUNCE_MS;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(schedulePush, delay);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [ready, uid, data.bookmarks, data.highlights, data.notes, data.readLessons, data.stopMarks, data.theme, syncDisabled, schedulePush]);

  // 3) دفع فوري عند مغادرة التبويب أو قفل الشاشة (visibilitychange = hidden / pagehide)
  // يضمن عدم تعليق التعديلات في مؤقت المتصفح عند غلق الهاتف أو التبديل لتطبيق آخر
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || syncDisabled || !isFirebaseConfigured) return undefined;

    const onHide = (): void => {
      if (document.visibilityState === 'hidden') {
        const payload = toSyncable(dataRef.current, {});
        const signature = librarySignature(payload);
        if (signature !== lastPushedRef.current) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          schedulePush();
        }
      }
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [ready, uid, syncDisabled, schedulePush]);

  // 4) سحب فوري عند عودة التبويب للمقدمة — يُغطّي حالة «سِبت اللابتوب وشغّلت الفون»
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || syncDisabled || !isFirebaseConfigured) return undefined;
    const onVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      if (applyingRef.current) return;
      void (async () => {
        try {
          const [{ getFirestore }, fs] = await Promise.all([
            import('../firebase/config'),
            import('firebase/firestore'),
          ]);
          const { db } = await getFirestore();
          const snap = await fs.getDoc(fs.doc(db, libraryDocPath(uid)));
          mergeAndApply(snap.exists() ? (snap.data() as Partial<SyncableLibrary>) : null);
        } catch { /* المستمع الحيّ سيغطي عند وصول اتصال */ }
      })();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ready, uid, syncDisabled, mergeAndApply]);
}
