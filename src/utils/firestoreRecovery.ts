// إنقاذ من أعطال Firestore الداخلية القاتلة (ca9 ثم b815).
// بعد ca9 يُعطّل SDK طابور العمليات كله، فلا ينجح أي طلب أو مستمع حتى إعادة تحميل الصفحة.
// نُعيد التحميل تلقائيًا مرة واحدة كل فترة بدل ترك التطبيق ميتًا، مع حماية من حلقة إعادة تحميل.

const RECOVERY_KEY = 'firestore_assertion_reload_at';
// مرة واحدة كل 5 دقائق كحد أقصى — العمل نفسه عابر، فلا نُغرق المستخدم بإعادات تحميل.
const MIN_INTERVAL_MS = 5 * 60_000;

let recovering = false;

export function isFatalFirestoreError(reason: unknown): boolean {
  let message = '';
  if (typeof reason === 'string') message = reason;
  else if (reason instanceof Error) message = reason.message;
  else if (reason && typeof (reason as { message?: unknown }).message === 'string') {
    message = String((reason as { message: unknown }).message);
  }
  return message.includes('INTERNAL ASSERTION FAILED') && /\(ID: (ca9|b815)\)/.test(message);
}

// يعيد true إن كان الخطأ من النوع القاتل (سواء أُعيد التحميل أو كان ضمن فترة الحماية).
export function recoverFromFatalFirestoreError(reason: unknown): boolean {
  if (!isFatalFirestoreError(reason)) return false;
  if (recovering) return true;
  recovering = true;
  try {
    const last = Number(sessionStorage.getItem(RECOVERY_KEY) || 0);
    if (Number.isFinite(last) && Date.now() - last < MIN_INTERVAL_MS) return true;
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    // بلا sessionStorage: نكتفي بحماية المتغير داخل الصفحة
  }
  window.location.reload();
  return true;
}

export function installFirestoreRecovery(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', (event) => {
    if (recoverFromFatalFirestoreError(event.reason)) event.preventDefault();
  });
  window.addEventListener('error', (event) => {
    recoverFromFatalFirestoreError(
      (event as ErrorEvent).error ?? (event as ErrorEvent).message,
    );
  });
}
