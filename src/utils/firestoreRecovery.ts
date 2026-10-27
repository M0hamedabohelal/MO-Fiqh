// إنقاذ من أعطال Firestore الداخلية القاتلة (ca9 ثم b815).
// بعد ca9 يُعطّل SDK طابور العمليات كله، فلا ينجح أي طلب أو مستمع حتى إعادة تحميل الصفحة.
//
// ⚠️ لماذا لا يكفي مستمعا window وحدها:
// الكول باك يُستدعى داخل flush لتحديث React، فالرمي فيه يمرّ على ErrorBoundary **قبل**
// أن يصل إلى window.error. لذلك مساران لا بد أن يُغطّى كلاهما:
//   1) window.error / unhandledrejection — للأخطاء خارج التصيير.
//   2) componentDidCatch في ErrorBoundary — للأخطاء داخل التصيير (هذا ما أسقط #/settings).
//
// وحماية إعادة التحميل يجب أن تسمح دائمًا بمحاولة عند عطل قاتل، لأن بقاء المستخدم
// على شاشة خطأ دائمة أسوأ من إعادة تحميل إضافية. التكرار يُعالَج بإبطال الكاش، لا بالامتناع.

const RECOVERY_KEY = 'firestore_assertion_reload_at';
// مرة واحدة كل 5 دقائق كحد أقصى — العمل نفسه عابر، فلا نُغرق المستخدم بإعادات تحميل.
const MIN_INTERVAL_MS = 5 * 60_000;
// إن تكرر العطل رغم إعادة التحميل فإن الكاش المحلي هو المشتبه الأول: قد يُعيد إنتاج
// نفس العدّاد المكسور (-1) عند كل إقلاع. نمسحه ثم نُعيد التحميل مرة أخرى.
const HARD_RESET_KEY = 'firestore_hard_reset_at';
// سقف انتظار مسح الكاش: التعافي أهم من نظافة الكاش.
const CACHE_CLEAR_TIMEOUT_MS = 1500;

let recovering = false;
let hardResetting = false;

export function isFatalFirestoreError(reason: unknown): boolean {
  let message = '';
  if (typeof reason === 'string') message = reason;
  else if (reason instanceof Error) message = reason.message;
  else if (reason && typeof (reason as { message?: unknown }).message === 'string') {
    message = String((reason as { message: unknown }).message);
  }
  return message.includes('INTERNAL ASSERTION FAILED') && /\(ID: (ca9|b815)\)/.test(message);
}

function readTimestamp(key: string): number {
  try {
    const raw = Number(sessionStorage.getItem(key) || 0);
    return Number.isFinite(raw) ? raw : 0;
  } catch {
    return 0;
  }
}

function writeTimestamp(key: string): void {
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // بلا sessionStorage: نكتفي بحماية المتغير داخل الصفحة
  }
}

// يمسح كاش Firestore (IndexedDB + المفاتيح المحلية) ليعود العميل على حالة نظيفة.
// سقف زمني صارم: المسح مساعد للتعافي، ولا يجوز أن يمنع إعادة التحميل إن تعطّل
// (IndexedDB مقفلة، أو حزمة Firebase لم تُحمّل بعد).
async function clearFirestoreCache(): Promise<void> {
  const clearDb = (async () => {
    try {
      const { getFirestore, isFirebaseConfigured } = await import('../firebase/config');
      if (!isFirebaseConfigured) return;
      const { db, fsMod } = await getFirestore();
      await fsMod.clearIndexedDbPersistence(db);
    } catch {
      // غير متاحة في كل الحالات (كاش في الذاكرة فقط، أو وصول متعدد للتبويبات)
    }
  })();
  const localKeys = (async () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('firestore_') && key !== RECOVERY_KEY && key !== HARD_RESET_KEY) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // بلا localStorage: لا شيء نمسحه
    }
  })();
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, CACHE_CLEAR_TIMEOUT_MS));
  await Promise.race([Promise.all([clearDb, localKeys]).then(() => undefined), timeout]);
}

/**
 * يتعافى من عطل Firestore قاتل داخل التصيير (يُستدعى من ErrorBoundary).
 * يعيد التحميل دائمًا — لا يترك المستخدم على شاشة خطأ — مع تفريغ الكاش إن تكرر العطل.
 */
export async function firestoreFatalRecovery(reason: unknown): Promise<void> {
  if (!isFatalFirestoreError(reason)) return;
  if (hardResetting) return;
  hardResetting = true;
  const lastAttempt = readTimestamp(RECOVERY_KEY);
  const repeated = lastAttempt > 0 && Date.now() - lastAttempt < MIN_INTERVAL_MS;
  writeTimestamp(RECOVERY_KEY);
  if (repeated) {
    writeTimestamp(HARD_RESET_KEY);
    await clearFirestoreCache();
  }
  window.location.reload();
}

// يعيد true إن كان الخطأ من النوع القاتل (سواء أُعيد التحميل أو كان ضمن فترة الحماية).
// يُستخدم من مستمعي window، حيث لا توجد شاشة خطأ ظاهرة نُخفّف عنها.
export function recoverFromFatalFirestoreError(reason: unknown): boolean {
  if (!isFatalFirestoreError(reason)) return false;
  if (recovering) return true;
  recovering = true;
  const last = readTimestamp(RECOVERY_KEY);
  const repeated = last > 0 && Date.now() - last < MIN_INTERVAL_MS;
  writeTimestamp(RECOVERY_KEY);
  if (repeated) {
    writeTimestamp(HARD_RESET_KEY);
    void clearFirestoreCache().finally(() => window.location.reload());
    return true;
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

// للاختبارات فقط: إعادة الحالة الداخلية
export function __resetRecoveryForTests(): void {
  recovering = false;
  hardResetting = false;
}

/* ── شاردات قديمة (stale chunks) ──
 *
 * بعد كل نشر تُبنى أسماء ملفات جديدة (hash)، والقديمة تُحذف من Hosting فتصرِف 404.
 * التبويب المفتوح من قبل النشر يحمل في ذاكرته أسماء الشاردات القديمة، فأول انتقال
 * إلى شاشة لم تُحمّل بعد يفشل بـ «Failed to fetch dynamically imported module»
 * أو ChunkLoadError. هذه ليست عطلًا برمجيًا — هي دليل قاطع على وجود نسخة أحدث،
 * والعلاج الصحيح تحديث لا رسالة خطأ.
 *
 * نُرجع هنا رسالة عربية واضحة في شاشة الخطأ لأن المستخدم لا يفهم «Failed to fetch».
 */
const STALE_CHUNK_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /Unable to preload CSS/i,
  /\/assets\/[A-Za-z0-9_.-]+\.js.*(404|Not Found)/i,
];

export function isStaleChunkError(reason: unknown): boolean {
  let message = '';
  if (typeof reason === 'string') message = reason;
  else if (reason instanceof Error) message = reason.message;
  else if (reason && typeof (reason as { message?: unknown }).message === 'string') {
    message = String((reason as { message: unknown }).message);
  }
  if (!message) return false;
  return STALE_CHUNK_PATTERNS.some((re) => re.test(message));
}

// إعادة تحميل لتجاوز الحزمة القديمة. لا نستخدم reloadNow هنا (يعيش في hook) لأن
// هذه الدالة تُستدعى من ErrorBoundary خارج شجرة الخطافات.
// نمسح اسم حزمة الإقلاع حتى يعيد التطبيق بناء أساسه على الحزمة الجديدة فعلًا.
export function reloadToLatest(): Promise<void> {
  try {
    sessionStorage.removeItem('active_build');
  } catch { /* بلا sessionStorage: يكفي التحميل */ }
  try {
    if ('caches' in window) {
      void caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith('workbox-precache'))
            .map((k) => caches.delete(k))
        )
      );
    }
  } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
  return Promise.resolve();
}
