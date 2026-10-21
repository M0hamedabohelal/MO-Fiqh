import { useEffect } from 'react';
import { safeGet, safeSet, safeRemove, safeParse } from '../utils/safeStorage';
import { logError } from '../utils/logError';

const LEGACY_VISIT_DAYS_KEY = 'fiqh_visit_days';
const VISIT_DAYS_EVENT = 'fiqh:visit-days-updated';
const MAX_DAYS = 365;

export const visitDaysStorageKey = (uid?: string): string =>
  uid ? `${LEGACY_VISIT_DAYS_KEY}_${uid}` : `${LEGACY_VISIT_DAYS_KEY}_guest`;

export function readVisitDays(key: string): string[] {
  const value = safeParse<unknown>(safeGet(key), []);
  return Array.isArray(value) ? value.filter((day): day is string => typeof day === 'string') : [];
}

function saveVisitDays(key: string, days: string[]): void {
  const normalized = Array.from(new Set(days)).sort().slice(-MAX_DAYS);
  safeSet(key, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(VISIT_DAYS_EVENT, { detail: { key } }));
}

// Track the local calendar day, keep account history separate, and merge changes from other devices live.
export function useVisitTracking(user: { uid: string } | null, authLoading: boolean): void {
  useEffect(() => {
    if (authLoading) return undefined;

    const uid = user?.uid;
    const key = visitDaysStorageKey(uid);
    const localDays = readVisitDays(key);
    // One-time migration from the old device-wide key. It must run for guests too,
    // otherwise a guest's streak silently resets to zero on the first load.
    const migratedKey = 'fiqh_visit_days_migrated';
    if (safeGet(migratedKey) !== '1') {
      const legacyDays = readVisitDays(LEGACY_VISIT_DAYS_KEY);
      if (legacyDays.length) localDays.push(...legacyDays);
      safeSet(migratedKey, '1');
    }
    // ترحيل أيام الضيف إلى حساب المستخدم عند تسجيل الدخول لأول مرة —
    // بلا هذا يفقد من قرأ كضيف سلسلة مواظبته فور الدخول (المفاتيح معزولة لكل حساب).
    if (uid) {
      const guestKey = visitDaysStorageKey(undefined);
      const guestDays = readVisitDays(guestKey);
      if (guestDays.length) {
        guestDays.forEach((d) => { if (!localDays.includes(d)) localDays.push(d); });
        // ننقلها مرة واحدة ثم نمسحها حتى لا تتسرّب لأي حساب لاحق على نفس الجهاز.
        safeRemove(guestKey);
      }
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${now.getFullYear()}-${month}-${day}`;
    if (!localDays.includes(today)) localDays.push(today);
    saveVisitDays(key, localDays);

    if (!uid) return undefined;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const [{ getFirestore }, fs] = await Promise.all([
          import('../firebase/config'),
          import('firebase/firestore'),
        ]);
        const { db } = await getFirestore();
        if (cancelled) return;
        const visitsRef = fs.doc(db, 'users', uid, 'data', 'visits');
        unsubscribe = fs.onSnapshot(visitsRef, (snapshot) => {
          if (cancelled) return;
          const cloudDays = snapshot.exists() && Array.isArray(snapshot.data().items)
            ? (snapshot.data().items as unknown[]).filter((value): value is string => typeof value === 'string')
            : [];
          const localDaysNow = readVisitDays(key);
          const merged = Array.from(new Set([...localDaysNow, ...cloudDays])).sort().slice(-MAX_DAYS);
          saveVisitDays(key, merged);
          // رفع فقط عند وجود أيام محلية غير موجودة سحابيًا — مقارنة محتوى دقيقة (تجنّب رفع صدى
          // وتجنّب تفويت اختلافات بنفس الطول)، والمكتوب اتحاد فلا يُفقد ما رآه جهاز آخر
          const unionNeedsUpload = merged.some((d) => !cloudDays.includes(d));
          if (unionNeedsUpload) {
            void fs.setDoc(visitsRef, { items: merged }, { merge: true })
              .catch((error) => logError('visits.sync', error));
          }
        }, (error) => {
          if (!cancelled) logError('visits.listen', error);
        });
      } catch (error) {
        if (!cancelled) logError('visits.listen', error);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.uid, authLoading]);
}

export const VISIT_DAYS_UPDATED_EVENT = VISIT_DAYS_EVENT;
