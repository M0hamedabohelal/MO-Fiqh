import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

// كشف «نسخة جديدة منشورة» عبر Service Worker مع استمرار فحص index.html كـ fallback:
type UpdateListener = (ready: boolean) => void;
const updateListeners = new Set<UpdateListener>();
let swNeedRefresh = false;
let swUpdater: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistered = false;

function setupServiceWorker(onUpdate: (ready: boolean) => void): () => void {
  updateListeners.add(onUpdate);

  if (!swRegistered && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    swRegistered = true;
    try {
      swUpdater = registerSW({
        immediate: true,
        onNeedRefresh() {
          swNeedRefresh = true;
          updateListeners.forEach((listener) => listener(true));
        },
        onOfflineReady() {
          // التطبيق جاهز للعمل دون اتصال
        },
      });
    } catch {
      // بيئات لا تدعم SW
    }
  }

  return () => {
    updateListeners.delete(onUpdate);
  };
}

// كشف «نسخة جديدة منشورة» بلا Service Worker وبلا PWA:
// نقارن اسم حزمة الجافاسكربت التي يعمل عليها التبويب الحالي باسم الحزمة في
// index.html على الخادم. اختلاف الاسم = نشرة جديدة. لا شيء يُخزَّن، ولا اعتماد
// على navigator.onLine (غير موثوق على أندرويد).

/** اسم الحزمة الرئيسية داخل وسم <script> في صفحة index.html */
export const extractEntryAsset = (html: string): string | null => {
  const match = html.match(/\/?assets\/index-[A-Za-z0-9_-]+\.js/);
  return match ? match[0].replace(/^\//, '') : null;
};

/** الحزمة التي يعمل عليها التبويب الآن (من وسم السكربت في الصفحة الحالية) */
export const currentEntryAsset = (doc: Document = document): string | null => {
  const script = doc.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  return script ? extractEntryAsset(script.src) : null;
};

/** هل الخادم يقدّم حزمة مختلفة عمّا يعمل الآن؟ */
export const isNewerBuild = (running: string | null, served: string | null): boolean =>
  Boolean(running && served && running !== served);

// حزمة أول إقلاع في هذه الجلسة (التبويب).
//
// لماذا sessionStorage: بعد إعادة التحميل يحمل وسم السكربت اسم الحزمة **الجديد**، فلو
// قارنّا دائمًا بالحزمة الحالية لكان الفحص يقارن الملف بنفسه بعد كل تحديث، فيقول
// «أنت محدّث» حتى لو بدأ المستخدم على نسخة عمرها أسابيع. تسجيل حزمة الإقلاع يحفظ
// الحقيقة: هذه هي النسخة التي بدأ عليها التبويب فعلًا.
const BOOT_BUILD_KEY = 'active_build';

let bootBuildMemo: string | null = null;

/**
 * الأساس الذي نقارن به ما يقدّمه الخادم.
 *
 * المشكلة: `initial` هو وسم السكربت في الصفحة **الآن**، وهو يتغيّر بعد التحديث. لو
 * قارنّا به دائمًا لكان الفحص يقارن الملف بنفسه فيقول «محدّث» حتى لو بدأ التبويب على
 * نسخة عمرها أسابيع (وهو ما أعطى «أنت على أحدث نسخة» كاذبة).
 *
 * الحل: نحفظ أول `initial` رآه التبويب في sessionStorage. بعد إعادة تحميل **عادية**
 * يتطابق المحفوظ مع الحالي → نُعيده. بعد إعادة تحميل **بعد تحديث** يختلفان، والصحيح
 * أن الحزمة العاملة الآن هي الأحدث فعلًا → نتبنّاها ونكتبها فوق المحفوظ.
 */
export const readBootBuild = (initial: string | null): string | null => {
  if (bootBuildMemo) return bootBuildMemo;
  if (!initial) return null;
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(BOOT_BUILD_KEY);
  } catch {
    // بلا sessionStorage: نكتفي بذاكرة التبويب
  }
  // المحفوظ يساوي العاملة الآن → نفس التحميل، لا شيء جديد يُتعلَّم
  if (stored === initial) {
    bootBuildMemo = stored;
    return stored;
  }
  // اختلاف (أو أول مرة): العاملة الآن هي الحقيقة — تتضمّن حالة ما بعد التحديث
  try {
    sessionStorage.setItem(BOOT_BUILD_KEY, initial);
  } catch { /* يكفي ال memo */ }
  bootBuildMemo = initial;
  return initial;
};

// للاختبارات فقط: تصفير ذاكرة حزمة الإقلاع
export const __resetBootBuildForTests = (): void => { bootBuildMemo = null; };

const CHECK_INTERVAL_MS = 2 * 60 * 1000;

// هل التحديث التلقائي آمن الآن؟ القاعدة: لا نُقاطع كتابةً جارية.
// الملاحظات في هذا التطبيق تُحفظ بزر «حفظ» لا مع كل حرف، فإعادة تحميل مفاجئة أثناء
// الكتابة تُفقد المسودة. لا يكفي فحص العنصر النشط: المستخدم قد ينقر خارج الحقل
// ومسودته ما زالت داخله، فيمرّ التحديث ويضيع ما لم يُحفظ. نفحص كل حقول النص.
const NON_DRAFT_INPUT_TYPES = new Set([
  'hidden', 'checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'range', 'color', 'search',
]);

const hasUnsavedText = (el: Element): boolean => {
  if (el.tagName === 'TEXTAREA') {
    const field = el as HTMLTextAreaElement;
    return !field.disabled && !field.readOnly && field.value.trim() !== '';
  }
  if (el.tagName === 'INPUT') {
    const field = el as HTMLInputElement;
    if (field.disabled || field.readOnly || NON_DRAFT_INPUT_TYPES.has(field.type)) return false;
    return field.value.trim() !== '';
  }
  // سمة contenteditable لا خاصية isContentEditable: الثانية غير منفَّذة في بيئة الاختبار
  // (jsdom) فتُرجع دائمًا false فيمرّ الاختبار كاذبًا.
  const editableAttr = (el.getAttribute('contenteditable') ?? '').toLowerCase();
  if (editableAttr === '' || editableAttr === 'true' || editableAttr === 'plaintext-only') {
    return String(el.textContent ?? '').trim() !== '';
  }
  return false;
};

export const isSafeToAutoReload = (doc: Document = document): boolean => {
  const fields = doc.querySelectorAll('textarea, input, [contenteditable]');
  for (const field of fields) {
    if (hasUnsavedText(field)) return false;
  }
  return true;
};

// تأجيل قصير قبل التطبيق التلقائي: يتيح للمستخدم رؤية الشريط ولا يقطع رسم الصفحة
const AUTO_APPLY_DELAY_MS = 1500;

// محاولة واحدة لكل جلسة. بدونها: لو لم يستلم الـ Service Worker النسخة الجديدة بعد
// (العامل الجديد لم يُفعَّل)، يُخدَم الهيكل القديم مرة أخرى، فيُكتشف «نشر أحدث» من جديد
// وتدور إعادة التحميل إلى ما لا نهاية. الحارس يحوّل الحالة إلى الشريط اليدوي بدل الحلقة.
const AUTO_APPLY_KEY = 'auto_update_applied';

export interface AppVersionState {
  /** يوجد نشر أحدث من الحزمة العاملة */
  updateReady: boolean;
  /** آخر فحص انتهى بنتيجة (نجاح أو فشل) */
  lastCheckedAt: number | null;
  /** فحص جارٍ الآن */
  checking: boolean;
  /** إعادة التحميل جارية الآن */
  reloading: boolean;
  /** حالة آخر فحص للنسخة */
  checkStatus: 'idle' | 'up-to-date' | 'update-ready' | 'network-error' | 'dev';
  /** فحص فوري — يُستخدم لزر «تحقّق الآن» */
  checkNow: () => Promise<boolean>;
  /** فحص ثم إعادة تحميل بالقوة إن وُجد نشر أحدث — يعيد هل أُعيد التحميل */
  checkAndReload: () => Promise<boolean>;
  /** إعادة تحميل الصفحة لتحميل النسخة الجديدة */
  reloadNow: () => void;
  /** إخفاء الشريط لهذه الجلسة دون تحميل */
  dismiss: () => void;
  dismissed: boolean;
  /** الحزمة التي يعمل عليها هذا التحميل (حزمة الإقلاع، لا الحزمة الحالية) */
  bootBuild: string | null;
  /** الحزمة التي يعمل عليها التبويب الآن (للشفافية) */
  runningBuild: string | null;
}

export function useAppVersion(): AppVersionState {
  // الحزمة التي يعمل عليها هذا التحميل + حزمة الإقلاع — تُقرأ مرة واحدة عند التركيب
  // وتبقى ثابتة، فنضعها في حالة لا في ref (قراءة ref أثناء العرض تُخالف قواعد React
  // وتُنتج دالة عرض غير نقية).
  const [runningBuild] = useState<string | null>(() => currentEntryAsset());
  // حزمة الإقلاع تُقرأ مرة واحدة فقط ولا تتغيّر داخل التبويب: الأساس يُعاد حسابه عند
  // الإقلاع التالي (readBootBuild) لا أثناء حياته. لذلك قيمة ثابتة لا setter.
  const [bootBuild] = useState<string | null>(() => readBootBuild(currentEntryAsset()));
  // الأساس الفعلي للمقارنة — يتغيّر بعد إعادة التحميل عند التحديث (انظر reloadNow)
  const bootRef = useRef<string | null>(bootBuild);
  // آخر حزمة رآها الخادم — تُصبح الأساس بعد التحديث
  const lastServedRef = useRef<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'up-to-date' | 'update-ready' | 'network-error' | 'dev'>('idle');
  const [dismissed, setDismissed] = useState(false);
  // يزيد عند مغادرة حقل/عودة التبويب لإعادة تقييم أمان التحديث بعد انتهاء المسودة
  const [safetyTick, setSafetyTick] = useState(0);
  const inFlightRef = useRef(false);

  const checkNow = useCallback(async (): Promise<boolean> => {
    // نقارن بحزمة الإقلاع لا بالحزمة الحالية: بعد إعادة التحميل تكون الحالية هي الجديدة
    // فتصبح المقارنة بين الملف ونفسه وتُنتج «محدّث» كاذبة.
    const running = bootRef.current;
    if (inFlightRef.current) return false;
    // في التطوير لا حزم مُجزّأة ولا نشر — نُبلّغ عن ذلك بوضوح
    if (!running) {
      setCheckStatus('dev');
      return false;
    }
    inFlightRef.current = true;
    setChecking(true);
    let abortTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      // 1. تحفيز Service Worker على تفقد الخادم لحزمة جديدة
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((r) => void r.update().catch(() => {}));
          }).catch(() => {});
        } catch { /* ignore */ }
      }

      // 2. فحص index.html مع مهلة 6 ثوانٍ كحد أقصى لمنع التعليق عند بطء الشبكة
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) {
        abortTimer = setTimeout(() => controller.abort(), 6000);
      }
      const res = await fetch(`/index.html?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!res.ok) {
        setCheckStatus('network-error');
        return false;
      }
      const served = extractEntryAsset(await res.text());
      if (!served) {
        setCheckStatus('network-error');
        return false;
      }
      lastServedRef.current = served;
      const newer = isNewerBuild(running, served);
      // الحزمة المخدومة تُصبح الأساس فور رؤيتها: بعد إعادة التحميل تصير هي العاملة،
      // فلا يصحّ أن تظل المقارنة معلّقة على حزمة الإقلاع القديمة إلى الأبد.
      if (newer) {
        setUpdateReady(true);
        setCheckStatus('update-ready');
      } else {
        // المخدوم = الأساس الحالي: لا نشر معلّق
        setUpdateReady(false);
        setCheckStatus('up-to-date');
      }
      return newer;
    } catch {
      // انقطاع شبكة أو تعذر جلب
      setCheckStatus('network-error');
      return false;
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
      inFlightRef.current = false;
      setChecking(false);
      setLastCheckedAt(Date.now());
    }
  }, []);

  const reloadNow = useCallback((): void => {
    setReloading(true);

    let reloaded = false;
    const doHardReload = () => {
      if (reloaded) return;
      reloaded = true;
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('v', String(Date.now()));
        // replace لا assign: يمنع زر الرجوع من العودة إلى الحالة القديمة
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }

      // شبكة أمان: فك حالة التحميل بعد 4 ثوانٍ حتى لا يظل الزر عالقًا في "لود" إن تعذر التحميل
      setTimeout(() => {
        setReloading(false);
      }, 4000);
    };

    // 1. تنظيف الكاشات العابرة فقط مع حماية كاش Workbox Precache لوضع عدم الاتصال (Offline Mode)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        window.caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (!key.startsWith('workbox-precache')) {
              void window.caches.delete(key);
            }
          });
        });
      } catch { /* ignore */ }
    }

    // 2. إذا كان هناك Service Worker، ننتظر تفعيله وتوليه زمام الصفحة (controllerchange) قبل إعادة التحميل
    // هذا يضمن 100% أن النسخة الجديدة هي التي ستخدم المستند عند عمل Reload ولا تعود النسخة القديمة من الكاش
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      let hasWaiting = false;

      // الاستماع لحدث تولي العامل الجديد التحكم بالصفحة (controllerchange)
      const onControllerChange = () => {
        try {
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        } catch { /* ignore */ }
        doHardReload();
      };

      try {
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      } catch { /* ignore */ }

      // شبكة أمان: في حال لم يُطلق المتصفح controllerchange خلال 2.5 ثانية (مثلاً العامل معلق أو أوفلاين)
      // نُعيد التحميل قسرياً حتى لا يعلق المستخدم
      const fallbackTimer = setTimeout(() => {
        try {
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        } catch { /* ignore */ }
        doHardReload();
      }, 2500);

      try {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            if (reg.waiting) {
              hasWaiting = true;
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            if (reg.installing) {
              hasWaiting = true;
              reg.installing.addEventListener('statechange', (e) => {
                const sw = e.target as ServiceWorker;
                if (sw.state === 'installed') {
                  sw.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
            void reg.update().catch(() => {});
          });

          // إذا لم نجد أي عامل ينتظر أو يثبت، ولا يوجد PWA update مسجل:
          // لا داعي للانتظار، نُعيد التحميل فوراً
          if (!hasWaiting && !swNeedRefresh) {
            clearTimeout(fallbackTimer);
            try {
              navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            } catch { /* ignore */ }
            doHardReload();
          }
        }).catch(() => {
          clearTimeout(fallbackTimer);
          doHardReload();
        });
      } catch {
        clearTimeout(fallbackTimer);
        doHardReload();
      }

      if (swNeedRefresh && swUpdater) {
        void swUpdater(true).catch(() => {
          // swUpdater داخلياً يطلق SKIP_WAITING وسيطلق controllerchange
        });
      }
      return;
    }

    // للمتصفحات التي لا تدعم Service Worker
    doHardReload();
  }, []);

  // «تحقّق الآن» في الإعدادات: يفحص، وإن وُجد نشر أحدث يُحدّث فورًا بدل الاكتفاء
  // برسالة. يعيد true إن أُعيد التحميل (فلا معنى لرسالة بعدها).
  const checkAndReload = useCallback(async (): Promise<boolean> => {
    const newer = await checkNow();
    if (!newer) return false;
    reloadNow();
    return true;
  }, [checkNow, reloadNow]);

  const dismiss = useCallback((): void => setDismissed(true), []);

  // إن كان التحديث جاهزًا والوقت غير آمن، أعد التقييم عند مغادرة الحقول أو عودة التبويب.
  // بدون ذلك كانت المحاولة تعلق حتى جلسة جديدة إن كانت المسودة مفتوحة لحظة وصول التحديث.
  useEffect(() => {
    if (!updateReady || dismissed) return undefined;
    const bump = (): void => setSafetyTick((tick) => tick + 1);
    document.addEventListener('focusout', bump);
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('focus', bump);
    return () => {
      document.removeEventListener('focusout', bump);
      document.removeEventListener('visibilitychange', bump);
      window.removeEventListener('focus', bump);
    };
  }, [updateReady, dismissed]);

  // تطبيق التحديث تلقائيًا حين يكون آمنًا.
  // سبب الوجود: بعد كل نشر يظل الـ Service Worker يخدم الهيكل القديم من precache حتى
  // يضغط المستخدم «تحديث الآن». عمليًا: يفتح رابطًا فيرى نسخة قديمة، ولا تظهر الجديدة
  // إلا بريفرش قسري — وهي الشكوى المتكررة. التطبيق التلقائي يزيل الخطوة اليدوية،
  // ويُستثنى منه الكتابة الجارية حتى لا تُفقد مسودة ملاحظة.
  useEffect(() => {
    if (!updateReady || dismissed) return undefined;
    if (!isSafeToAutoReload()) return undefined;
    // محاولة واحدة فقط في الجلسة — يمنع حلقة إعادة تحميل إن لم يستلم العامل النسخة الجديدة
    try {
      if (sessionStorage.getItem(AUTO_APPLY_KEY) === '1') return undefined;
    } catch {
      return undefined; // بلا تخزين جلسة لا نُخاطر بحلقة
    }
    const t = setTimeout(() => {
      // إعادة الفحص قبل التنفيذ: قد يبدأ المستخدم الكتابة خلال مهلة الانتظار
      if (!isSafeToAutoReload()) {
        setSafetyTick((tick) => tick + 1);
        return;
      }
      // العلامة تُكتب لحظة التنفيذ فقط؛ لو أُلغيت المحاولة بسبب مسودة
      // فلا تُحجب المحاولة التالية بعد حفظها/إغلاقها.
      try {
        sessionStorage.setItem(AUTO_APPLY_KEY, '1');
      } catch {
        return;
      }
      reloadNow();
    }, AUTO_APPLY_DELAY_MS);
    return () => clearTimeout(t);
  }, [updateReady, dismissed, reloadNow, safetyTick]);

  // الاستماع لتحديثات الـ Service Worker (PWA)
  useEffect(() => {
    return setupServiceWorker((ready) => {
      if (ready) {
        setUpdateReady(true);
        setCheckStatus('update-ready');
      }
    });
  }, []);

  // الفحص الأول بعد استقرار الإقلاع + دوري + عند عودة التبويب للمقدمة
  useEffect(() => {
    const first = setTimeout(() => void checkNow(), 2_000);
    const timer = setInterval(() => void checkNow(), CHECK_INTERVAL_MS);
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void checkNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [checkNow]);

  return {
    updateReady,
    lastCheckedAt,
    checking,
    reloading,
    checkStatus,
    checkNow,
    checkAndReload,
    reloadNow,
    dismiss,
    dismissed,
    bootBuild,
    runningBuild,
  };
}
