import { useEffect } from 'react';
import { safeGet, safeSet, safeParse } from '../utils/safeStorage';

const VISIT_DAYS_KEY = 'fiqh_visit_days';
const MAX_DAYS = 365;

// تسجيل يوم الزيارة لسلسلة المواظبة (آخر 365 يومًا) + دمجها سحابيًا
export function useVisitTracking(user: { uid: string } | null, authLoading: boolean): void {
  useEffect(() => {
    const readLocal = (): string[] => {
      const v = safeParse<unknown>(safeGet(VISIT_DAYS_KEY) || '[]', []);
      return Array.isArray(v) ? (v as string[]) : [];
    };
    const saveLocal = (days: string[]): void => {
      safeSet(VISIT_DAYS_KEY, JSON.stringify(days.slice(-MAX_DAYS)));
    };
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${now.getFullYear()}-${m}-${day}`;
    const localDays = readLocal();
    if (!localDays.includes(today)) {
      localDays.push(today);
      saveLocal(localDays);
    }
    if (!user || authLoading) return;
    // دمج أيام الأجهزة الأخرى من السحابة حتى لا تصفر السلسلة بتغيير الجهاز
    const uid = user.uid;
    let cancelled = false;
    (async () => {
      try {
        const { fetchUserData, syncVisitDays } = await import('../firebase/services');
        const cloud = await fetchUserData(uid);
        if (cancelled) return;
        const merged = Array.from(new Set([...(cloud.visits || []), ...readLocal()]))
          .sort()
          .slice(-MAX_DAYS);
        saveLocal(merged);
        await syncVisitDays(uid, merged);
      } catch (err) {
        // النسخة المحلية كافية للعرض — نسجّل الخطأ للمراقبة فقط
        try {
          const { logError } = await import('../utils/logError');
          logError('visits.sync', err);
        } catch { /* تجاهل */ }
      }
    })();
    // إلغاء الدمج المتأخر عند تبديل المستخدم — حتى لا تلوّث أيام حساب قديم بيانات الجديد
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);
}
