import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';
import { logError } from '../utils/logError';
import {
  cloudEnabled,
  libraryDocPath,
  librarySignature,
  mergeLibraries,
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
//   - `suppressUntilRef`: نافذة سماح بعد كتابتنا تبتلع الصدى المتأخر.
//   - `applyingRef`: أثناء تطبيق دمج على الحالة المحلية لا نُطلق دفعة جديدة.
// بدون هذه الحمايات تتحول المزامنة إلى كتابة/لقطة لا نهائية (عطل وقع فعلًا في
// مزامنة الإشعارات، وموثّق في تعليق useAnnouncements).

const SYNC_DEBOUNCE_MS = 2000;
// نافذة ابتلاع صدى كتابتنا — أطول من زمن وصول اللقطة عادةً على الجوال
const ECHO_WINDOW_MS = 4000;

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

  // آخر توقيع كتبناه — يقطع حلقة الكتابة ويوفّر كتابات زائدة
  const lastPushedRef = useRef<string>('');
  // حتى متى نبتلع صدى كتابتنا (epoch ms)
  const suppressUntilRef = useRef<number>(0);
  // هل نطبّق دمجًا الآن؟ (منع إطلاق دفعة أثناء التطبيق)
  const applyingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMergedRef = useRef(onMerged);
  const dataRef = useRef(data);
  // إبقاء المراجع محدثة بدون إعادة تشغيل الآثار
  useEffect(() => { onMergedRef.current = onMerged; }, [onMerged]);
  useEffect(() => { dataRef.current = data; }, [data]);

  const toSyncable = (src: LibrarySyncInput, stamps: Record<string, number>): SyncableLibrary => ({
    bookmarks: src.bookmarks.map(String),
    highlights: src.highlights,
    notes: src.notes,
    readLessons: src.readLessons.map(String),
    updatedAt: stamps,
    theme: src.theme,
    stopMarks: src.stopMarks,
  });

  const mergeAndApply = useCallback((cloudRaw: Partial<SyncableLibrary> | null): void => {
    const local = toSyncable(dataRef.current, {});
    if (!cloudRaw) {
      // لا شيء سحابيًا بعد: ارفع المحلي كأساس أول
      lastPushedRef.current = '';
      return;
    }

    // صدى كتابتنا نحن: التوقيع السحابي = آخر ما كتبناه → لا شيء نفعله
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
    if (cloudSignature === lastPushedRef.current) return;
    if (Date.now() < suppressUntilRef.current) return;

    const merged: SyncableLibrary = mergeLibraries(cloud, local);
    const localSignature = librarySignature(local);
    const mergedSignature = librarySignature(merged);

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
      // نترك التطبيق يكتمل قبل السماح بدفعة جديدة
      setTimeout(() => { applyingRef.current = false; }, SYNC_DEBOUNCE_MS);
    } else {
      lastPushedRef.current = mergedSignature;
      applyingRef.current = false;
    }
  }, []);

  // 1) مستمع حيّ على مستند المكتبة — يصل تعديل كل الأجهزة فورًا
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || !isFirebaseConfigured) return undefined;
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
            if (cancelled || applyingRef.current) return;
            mergeAndApply(snap.exists() ? (snap.data() as Partial<SyncableLibrary>) : null);
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
  }, [ready, uid, mergeAndApply]);

  // 2) الدفع عند تغيّر المحتوى (debounced) — لا كتابة بلا اختلاف حقيقي
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || !isFirebaseConfigured) return undefined;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // أثناء تطبيق دمج لا ندفع (وإلا صرعنا الدمج بكتابة جزئية)
      if (applyingRef.current) return;

      const payload = toSyncable(data, {});
      const signature = librarySignature(payload);
      if (signature === lastPushedRef.current) return;
      lastPushedRef.current = signature;
      // نافذة ابتلاع: صدى هذه الكتابة سيصل عبر المستمع بعد قليل
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;

      void (async () => {
        try {
          const [{ getFirestore }, fs] = await Promise.all([
            import('../firebase/config'),
            import('firebase/firestore'),
          ]);
          const { db } = await getFirestore();
          // updatedAt: طابع زمني لكل مفتاح قابل للاستبدال — أساس حلّ التعارض
          const now = Date.now();
          const stamps: Record<string, number> = {};
          Object.keys(payload.notes).forEach((id) => { stamps[`note:${id}`] = now; });
          payload.highlights.forEach((h: HighlightItem) => { stamps[`hl:${String(h?.id ?? h?.text ?? '')}`] = now; });
          stamps.theme = now;

          await fs.setDoc(
            fs.doc(db, libraryDocPath(uid)),
            {
              bookmarks: payload.bookmarks,
              highlights: payload.highlights,
              notes: payload.notes,
              readLessons: payload.readLessons,
              stopMarks: payload.stopMarks ?? {},
              theme: payload.theme,
              updatedAt: stamps,
            },
            { merge: true },
          );
        } catch (error) {
          logError('library.sync.push', error);
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uid, data.bookmarks, data.highlights, data.notes, data.readLessons, data.stopMarks, data.theme]);

  // 3) سحب فوري عند عودة التبويب للمقدمة — يُغطّي حالة «سِبت اللابتوب وشغّلت الفون»
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || !isFirebaseConfigured) return undefined;
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
  }, [ready, uid, mergeAndApply]);
}
