import { useEffect } from 'react';
import { safeGet, safeSet, safeRemove, safeParse } from '../utils/safeStorage';

// سلسلة المواظبة — محلية فقط (بدون أي مزامنة سحابية).
// أيام الزيارة تُحفظ في localStorage، معزولة لكل حساب ولكل ضيف.

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

export function useVisitTracking(user: { uid: string } | null, authLoading: boolean): void {
  useEffect(() => {
    if (authLoading) return;

    const uid = user?.uid;
    const key = visitDaysStorageKey(uid);
    const localDays = readVisitDays(key);

    // ترحيل لمرة واحدة من المفتاح القديم (يخصّ الضيف أيضًا وإلا صفّرت سلسلته)
    const migratedKey = 'fiqh_visit_days_migrated';
    if (safeGet(migratedKey) !== '1') {
      const legacyDays = readVisitDays(LEGACY_VISIT_DAYS_KEY);
      if (legacyDays.length) localDays.push(...legacyDays);
      safeSet(migratedKey, '1');
    }

    // ترحيل أيام الضيف إلى الحساب عند أول دخول
    if (uid) {
      const guestKey = visitDaysStorageKey(undefined);
      const guestDays = readVisitDays(guestKey);
      if (guestDays.length) {
        guestDays.forEach((d) => { if (!localDays.includes(d)) localDays.push(d); });
        safeRemove(guestKey);
      }
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${now.getFullYear()}-${month}-${day}`;
    if (!localDays.includes(today)) localDays.push(today);
    saveVisitDays(key, localDays);
  }, [user?.uid, authLoading]);
}

export const VISIT_DAYS_UPDATED_EVENT = VISIT_DAYS_EVENT;
