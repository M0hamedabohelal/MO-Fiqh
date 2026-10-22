import { useCallback, useEffect, useRef, useState } from 'react';

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

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export interface AppVersionState {
  /** يوجد نشر أحدث من الحزمة العاملة */
  updateReady: boolean;
  /** آخر فحص انتهى بنتيجة (نجاح أو فشل) */
  lastCheckedAt: number | null;
  /** فحص جارٍ الآن */
  checking: boolean;
  /** فحص فوري — يُستخدم لزر «تحقّق الآن» */
  checkNow: () => Promise<boolean>;
  /** إعادة تحميل الصفحة لتحميل النسخة الجديدة */
  reloadNow: () => void;
  /** إخفاء الشريط لهذه الجلسة دون تحميل */
  dismiss: () => void;
  dismissed: boolean;
}

export function useAppVersion(): AppVersionState {
  const runningRef = useRef<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inFlightRef = useRef(false);

  if (runningRef.current === null) runningRef.current = currentEntryAsset();

  const checkNow = useCallback(async (): Promise<boolean> => {
    const running = runningRef.current;
    // في التطوير لا حزم مُجزّأة ولا نشر — الفحص بلا معنى
    if (!running || inFlightRef.current) return false;
    inFlightRef.current = true;
    setChecking(true);
    try {
      const res = await fetch(`/index.html?ts=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return false;
      const served = extractEntryAsset(await res.text());
      const newer = isNewerBuild(running, served);
      if (newer) setUpdateReady(true);
      return newer;
    } catch {
      // انقطاع شبكة عابر ليس خبرًا — لا نُعلن تحديثًا ولا نُخفي ما سبق
      return false;
    } finally {
      inFlightRef.current = false;
      setChecking(false);
      setLastCheckedAt(Date.now());
    }
  }, []);

  const reloadNow = useCallback((): void => {
    // إعادة تحميل كاملة تتجاوز الكاش بطلب لا-تخزين للحزمة الجديدة
    window.location.reload();
  }, []);

  const dismiss = useCallback((): void => setDismissed(true), []);

  // الفحص الأول بعد استقرار الإقلاع + دوري + عند عودة التبويب للمقدمة
  useEffect(() => {
    const first = setTimeout(() => void checkNow(), 8_000);
    const timer = setInterval(() => void checkNow(), CHECK_INTERVAL_MS);
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void checkNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkNow]);

  return { updateReady, lastCheckedAt, checking, checkNow, reloadNow, dismiss, dismissed };
}
