import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAnnouncements } from '../firebase/services';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../Components/Auth/AuthContext';
import { logError } from '../utils/logError';
import type { AnnouncementItem } from '../types';

const readKey = (uid?: string): string => uid ? `readAnnouncements_${uid}` : 'readAnnouncements';

// permission-denied يعني أن قاعدة Firestore لا تسمح بهذا المسار. التطبيق يعمل
// محليًا بالكامل حينها، فهي ليست عطلًا يحتاج تشخيصًا متكررًا.
function isPermissionDenied(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.includes('permission-denied')) return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /missing or insufficient permissions/i.test(message);
}

function readLocalIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function useAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const key = readKey(user?.uid);
  // رفض الصلاحيات يُسجَّل مرة واحدة لكل جلسة، لا عند كل إعادة اشتراك (كان ثلاث مرات).
  const announcedDeniedRef = useRef(false);
  const unreadCount = announcements.filter((item) => !readIds.includes(item.id)).length;

  const load = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      setAnnouncements(await fetchAnnouncements());
    } catch {
      // تجاهل أخطاء الجلب — التنبيهات ليست حرجة
    }
  }, []);

  useEffect(() => {
    // جلب أولي عند التحميل — مقصود (لا بديل تفاعلي له)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadIds(readLocalIds(key));
    load();
  }, [key, load]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !isFirebaseConfigured) return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const localKey = readKey(uid);
    void (async () => {
      try {
        const [{ getFirestore }, fs] = await Promise.all([
          import('../firebase/config'),
          import('firebase/firestore'),
        ]);
        const { db } = await getFirestore();
        if (cancelled) return;
        const readsRef = fs.doc(db, 'users', uid, 'data', 'announcementReads');
        // حارس ضد حلقة كتابة: المستمع يشتعل بعد كل كتابة، فلو كتبنا كل مرة نعود بلا
        // نهاية (كتابة → لقطة → كتابة). نكتب فقط عند اختلاف حقيقي، ومرة واحدة لكل تغيير.
        let lastSyncedSignature = '';
        let pushed = false;
        let pendingPush: string[] | null = null;

        const pushToServer = (items: string[]) => {
          if (pushed) {
            pendingPush = items;
            return;
          }
          pushed = true;
          const signature = items.join('|');
          fs.setDoc(readsRef, { items, updatedAt: Date.now() }, { merge: true })
            .then(() => {
              lastSyncedSignature = signature;
            })
            .catch((error) => logError('announcements.sync', error))
            .finally(() => {
              pushed = false;
              if (pendingPush) {
                const next = pendingPush;
                pendingPush = null;
                if (next.join('|') !== lastSyncedSignature) {
                  pushToServer(next);
                }
              }
            });
        };

        unsubscribe = fs.onSnapshot(readsRef, (snapshot) => {
          if (cancelled) return;
          const cloudIds = snapshot.exists() && Array.isArray(snapshot.data().items)
            ? (snapshot.data().items as unknown[]).filter((id): id is string => typeof id === 'string')
            : [];
          const localIds = readLocalIds(localKey);
          const merged = Array.from(new Set([...cloudIds, ...localIds]));
          setReadIds(merged);
          try { localStorage.setItem(localKey, JSON.stringify(merged)); } catch { /* الذاكرة تكفي للجلسة */ }

          const signature = merged.join('|');
          if (signature === lastSyncedSignature) return; // لا تغيير: لا كتابة
          const needsPush = merged.length !== cloudIds.length || !snapshot.exists();
          if (!needsPush) { lastSyncedSignature = signature; return; }
          pushToServer(merged);
        }, (error) => {
          // صلاحيات مرفوضة ليست عطلًا: التطبيق يعمل محليًا بالكامل (localStorage).
          // سجّلها مرة واحدة لكل جلسة بدل إغراق الكونسول عند كل إعادة اشتراك.
          if (cancelled || announcedDeniedRef.current) return;
          if (isPermissionDenied(error)) announcedDeniedRef.current = true;
          logError('announcements.listen', error);
        });
      } catch (error) {
        if (!cancelled) logError('announcements.listen', error);
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.uid]);

  const markAsRead = useCallback(() => {
    const allIds = announcements.map((item) => item.id);
    // دمج مع المعروف محليًا بدل الاستبدال — الكتابة العمياء كانت تمحو قراءات جهاز آخر
    const merged = Array.from(new Set([...readLocalIds(key), ...allIds]));
    setReadIds(merged);
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* الحالة داخل الذاكرة تكفي للجلسة */ }
    if (user && isFirebaseConfigured) {
      void (async () => {
        try {
          const [{ getFirestore }, fs] = await Promise.all([
            import('../firebase/config'),
            import('firebase/firestore'),
          ]);
          const { db } = await getFirestore();
          // قراءة الحالة السحابية الأحدث أولًا ثم الدمج — لا نمحو ما قرأه جهاز آخر للتو
          const readsRef = fs.doc(db, 'users', user.uid, 'data', 'announcementReads');
          const snap = await fs.getDoc(readsRef);
          const cloudIds = snap.exists() && Array.isArray(snap.data().items)
            ? (snap.data().items as unknown[]).filter((id): id is string => typeof id === 'string')
            : [];
          const finalIds = Array.from(new Set([...cloudIds, ...merged]));
          await fs.setDoc(readsRef, { items: finalIds, updatedAt: Date.now() }, { merge: true });
        } catch (error) {
          logError('announcements.sync', error);
        }
      })();
    }
  }, [announcements, key, user]);

  return { announcements, unreadCount, markAsRead, refresh: load };
}
