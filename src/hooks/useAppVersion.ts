import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

// كشف «نسخة جديدة منشورة» عبر Service Worker مع استمرار فحص index.html كـ fallback:
type UpdateListener = (ready: boolean) => void;
const updateListeners = new Set<UpdateListener>();
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
    try {
      const res = await fetch(`/index.html?ts=${Date.now()}`, { cache: 'no-store' });
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
      inFlightRef.current = false;
      setChecking(false);
      setLastCheckedAt(Date.now());
    }
  }, []);

  const reloadNow = useCallback((): void => {
    setReloading(true);

    const doHardReload = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('v', String(Date.now()));
        // replace لا assign: يمنع زر الرجوع من العودة إلى الحالة القديمة
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
      // شبكة أمان للفون والمتصفحات التي لا تُعيد تحميل المستند عند تغيّر searchParams في hash-router
      setTimeout(() => {
        try {
          window.location.reload();
        } catch { /* ignore */ }
      }, 120);
    };

    if (swUpdater) {
      void swUpdater(true).catch(() => {
        doHardReload();
      });
      return;
    }

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
