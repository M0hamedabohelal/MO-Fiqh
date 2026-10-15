// تسجيل مركزي للأخطاء — بديل خفيف لـ Sentry
// يكتب دائمًا في console، ويكتب في Firestore (client_errors) للمستخدم المسجل فقط وبحد أقصى.
import { safeGet, safeSet } from './safeStorage';

const THROTTLE_KEY = 'logError_lastSent';
const THROTTLE_MS = 60_000;
const MAX_MSG = 300;

export function logError(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err ?? 'unknown');
  const short = message.slice(0, MAX_MSG);
  try {
    console.error(`[${scope}]`, short, extra ?? '');
  } catch {
    /* تجاهل */
  }

  // خنق الكتابة السحابية: حدث واحد كل دقيقة كحد أقصى
  try {
    const last = Number(safeGet(THROTTLE_KEY) || 0);
    if (Date.now() - last < THROTTLE_MS) return;
    safeSet(THROTTLE_KEY, String(Date.now()));
  } catch {
    return;
  }

  // إرسال غير حاجب — يُحمَّل Firestore مؤجلًا فقط عند وجود خطأ حقيقي
  void (async () => {
    try {
      const { getFirestore, isFirebaseConfigured } = await import('../firebase/config');
      if (!isFirebaseConfigured) return;
      const { db, fsMod } = await getFirestore();
      await fsMod.addDoc(fsMod.collection(db, 'client_errors'), {
        scope,
        message: short,
        extra: extra ?? null,
        url: location.href,
        at: Date.now(),
        // انتهاء تلقائي بعد 30 يومًا عبر سياسة TTL على هذا الحقل (تُفعَّل من الكونسول)
        expireAt: fsMod.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      });
    } catch {
      /* تجاهل — التسجيل لا يجب أن يكسر التطبيق */
    }
  })();
}
