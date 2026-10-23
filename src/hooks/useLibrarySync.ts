import { useEffect, useRef } from 'react';
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

// ─── مزامنة مكتبة المستخدم مع السحابة ───
//
// التدفق الآمن (لا فقدان بيانات):
//   1) قراءة المستند السحابي (getDoc) — لقطة واحدة، لا مستمع دائم.
//      السبب: مستمع دائم على مستند يكتبه العميل نفسه يُنتج حلقة كتابة/لقطة، وهي
//      مشكلة وقعت فعلًا في مزامنة الإشعارات. هنا نكتفي بقراءة عند الإقلاع وبعد
//      كل كتابة محلية (debounced)، وهي كافية للمزامنة بين الأجهزة.
//   2) دمج السحابي مع المحلي (mergeLibraries) — لا استبدال.
//   3) كتابة الناتج إن اختلف توقيعه عن آخر ما كتبناه.
//
// ما لا تفعله هذه الطبقة: لا تحذف بيانات، ولا تكتب بلا حساب، ولا تُشغّل نفسها
// إن لم يُفعَّل Firebase.

const SYNC_DEBOUNCE_MS = 2500;

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

  // آخر توقيع كتبناه — يمنع إعادة الكتابة بلا داعٍ ويقطع أي حلقة محتملة
  const lastPushedRef = useRef<string>('');
  // هل قرأنا السحابة لهذا المستخدم في هذه الجلسة؟
  const hydratedForRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMergedRef = useRef(onMerged);
  // إبقاء المرجع محدثًا بدون إعادة تشغيل الأثر
  useEffect(() => { onMergedRef.current = onMerged; }, [onMerged]);

  const toSyncable = (src: LibrarySyncInput, stamps: Record<string, number>): SyncableLibrary => ({
    bookmarks: src.bookmarks.map(String),
    highlights: src.highlights,
    notes: src.notes,
    readLessons: src.readLessons.map(String),
    updatedAt: stamps,
    theme: src.theme,
    stopMarks: src.stopMarks,
  });

  // 1) السحب عند أول جاهزية لكل مستخدم
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || !isFirebaseConfigured) return undefined;
    if (hydratedForRef.current === uid) return undefined;
    hydratedForRef.current = uid;
    let cancelled = false;

    void (async () => {
      try {
        const [{ getFirestore }, fs] = await Promise.all([
          import('../firebase/config'),
          import('firebase/firestore'),
        ]);
        const { db } = await getFirestore();
        const ref = fs.doc(db, libraryDocPath(uid));
        const snap = await fs.getDoc(ref);
        if (cancelled) return;

        const cloudRaw = snap.exists() ? (snap.data() as Partial<SyncableLibrary & { theme?: string }>) : null;
        if (!cloudRaw) {
          // لا شيء سحابيًا: ارفع المحلي كأساس أول
          lastPushedRef.current = '';
          return;
        }

        const cloud = toSyncable(
          {
            bookmarks: (cloudRaw.bookmarks ?? []) as string[],
            highlights: (cloudRaw.highlights ?? []) as HighlightItem[],
            notes: (cloudRaw.notes ?? {}) as Record<string, string>,
            readLessons: (cloudRaw.readLessons ?? []) as string[],
            stopMarks: (cloudRaw.stopMarks ?? {}) as StopMarkMap,
            theme: typeof cloudRaw.theme === 'string' ? cloudRaw.theme : data.theme,
          },
          cloudRaw.updatedAt ?? {},
        );
        const local = toSyncable(data, cloudRaw.updatedAt ?? {});
        const merged: SyncableLibrary = mergeLibraries(cloud, local);

        // لا نطبّق الدمج على الواجهة إلا إن كان فيه جديد فعلًا (يتجنّب رجّة بصرية)
        if (librarySignature(merged) !== librarySignature(local)) {
          onMergedRef.current({
            bookmarks: merged.bookmarks,
            highlights: merged.highlights,
            notes: merged.notes,
            readLessons: merged.readLessons,
            stopMarks: (merged.stopMarks ?? {}) as StopMarkMap,
            theme: merged.theme ?? data.theme,
          });
        }
        lastPushedRef.current = librarySignature(merged);
      } catch (error) {
        logError('library.sync.pull', error);
      }
    })();

    return () => { cancelled = true; };
    // data متغيّرة باستمرار؛ الاعتماد على uid/ready فقط مقصود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uid]);

  // 2) الدفع عند تغيّر المحتوى (debounced) — لا كتابة بلا اختلاف حقيقي
  useEffect(() => {
    if (!ready || !cloudEnabled(uid) || !isFirebaseConfigured) return undefined;
    if (hydratedForRef.current !== uid) return undefined; // لم يتم السحب بعد لهذا المستخدم

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const payload = toSyncable(data, {});
      const signature = librarySignature(payload);
      if (signature === lastPushedRef.current) return;
      lastPushedRef.current = signature;

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
}
