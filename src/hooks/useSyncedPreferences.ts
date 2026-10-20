import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logError } from '../utils/logError';

interface Preferences {
  theme: string;
  fontSize: number;
  lastReadLessonId: string | null;
}

const isTheme = (value: unknown): value is 'dark' | 'sepia' => value === 'dark' || value === 'sepia';
const isLastRead = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/** Keep appearance and reading-progress preferences in sync for signed-in devices, with local state as the offline fallback. */
export function useSyncedPreferences(
  uid: string | undefined,
  authLoading: boolean,
  theme: string,
  setTheme: Dispatch<SetStateAction<string>>,
  fontSize: number,
  setFontSize: Dispatch<SetStateAction<number>>,
  lastReadLessonId: string | null,
  setLastReadLessonId: Dispatch<SetStateAction<string | null>>,
): void {
  const [readyUid, setReadyUid] = useState<string | null>(null);
  const lastCloudValue = useRef<Preferences | null>(null);
  // Current local values. The listener is registered once per account, so it reads this ref
  // instead of the stale closure captured at registration time.
  const localRef = useRef<Preferences>({ theme, fontSize, lastReadLessonId });
  useEffect(() => {
    localRef.current = { theme, fontSize, lastReadLessonId };
  }, [theme, fontSize, lastReadLessonId]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!uid) {
      lastCloudValue.current = null;
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    lastCloudValue.current = null;

    void (async () => {
      try {
        const [{ getFirestore }, fs] = await Promise.all([
          import('../firebase/config'),
          import('firebase/firestore'),
        ]);
        const { db } = await getFirestore();
        if (cancelled) return;
        const preferencesRef = fs.doc(db, 'users', uid, 'data', 'preferences');
        unsubscribe = fs.onSnapshot(preferencesRef, (snapshot) => {
          if (cancelled) return;
          const local = localRef.current;
          let next: Preferences;
          if (snapshot.exists()) {
            const data = snapshot.data();
            // A valid cloud value wins; an absent one keeps the local value instead of wiping it.
            next = {
              theme: isTheme(data.theme) ? data.theme : local.theme,
              fontSize: typeof data.fontSize === 'number' && data.fontSize >= 14 && data.fontSize <= 24
                ? data.fontSize
                : local.fontSize,
              lastReadLessonId: isLastRead(data.lastReadLessonId) ? data.lastReadLessonId : local.lastReadLessonId,
            };
          } else {
            // First signed-in device seeds the account from its existing local settings.
            next = { ...local };
            void fs.setDoc(preferencesRef, { ...next, updatedAt: Date.now() }, { merge: true })
              .catch((error) => logError('preferences.sync', error));
          }
          lastCloudValue.current = next;
          if (next.theme !== local.theme) setTheme(next.theme);
          if (next.fontSize !== local.fontSize) setFontSize(next.fontSize);
          if (next.lastReadLessonId !== local.lastReadLessonId) setLastReadLessonId(next.lastReadLessonId);
          setReadyUid(uid);
        }, (error) => {
          if (!cancelled) logError('preferences.listen', error);
        });
      } catch (error) {
        if (!cancelled) logError('preferences.listen', error);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, authLoading]);

  useEffect(() => {
    if (!uid || readyUid !== uid) return undefined;
    const current = { theme, fontSize, lastReadLessonId };
    const previous = lastCloudValue.current;
    // Every field participates: skipping lastReadLessonId would leave reading progress on the seed value forever.
    if (
      previous?.theme === current.theme &&
      previous.fontSize === current.fontSize &&
      previous.lastReadLessonId === current.lastReadLessonId
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ getFirestore }, fs] = await Promise.all([
            import('../firebase/config'),
            import('firebase/firestore'),
          ]);
          const { db } = await getFirestore();
          // كتابة الحقول المتغيّرة فقط (دمج حقل-بحقل) بدل الكائن كاملًا:
          // يمنع جهازًا غيّر حقلًا (المظهر) من محو حقلٍ غيّره جهاز آخر (آخر مسألة) في آن
          const patch: Record<string, unknown> = {};
          if (!previous || previous.theme !== current.theme) patch.theme = current.theme;
          if (!previous || previous.fontSize !== current.fontSize) patch.fontSize = current.fontSize;
          if (!previous || previous.lastReadLessonId !== current.lastReadLessonId) patch.lastReadLessonId = current.lastReadLessonId;
          if (Object.keys(patch).length === 0) return;
          await fs.setDoc(fs.doc(db, 'users', uid, 'data', 'preferences'), {
            ...patch,
            updatedAt: Date.now(),
          }, { merge: true });
          // انعكاس ما كُتب على مرجع السحابة (يبقى الباقي كما نراه من آخر لقطة)
          lastCloudValue.current = { ...(previous ?? current), ...patch } as Preferences;
        } catch (error) {
          logError('preferences.sync', error);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [uid, readyUid, theme, fontSize, lastReadLessonId]);
}
