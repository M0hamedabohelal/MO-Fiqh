import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { probeOnline } from '../utils/connectivity';

/**
 * إدارة حالة التطبيق المثبت (PWA):
 * - زر التثبيت المخصص عبر حدث beforeinstallprompt
 * - إشعار "تحديث جديد جاهز" من الـ Service Worker
 * - مؤشر العمل بدون إنترنت
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const offlineRef = useRef(!navigator.onLine);

  // إجبار المتصفح على فحص الشبكة بحثًا عن Service Worker جديد —
  // updateSW(false) وحده يرسل SKIP_WAITING فقط ولا يفحص الشبكة، فبدونه لا يُكتشف أي تحديث إلا بإعادة تحميل الصفحة
  const forceUpdateCheck = useCallback(async (): Promise<void> => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        // sw.js يُقدَّم بلا كاش (no-cache) في الاستضافة فيُعاد التحقق منه دائمًا
        await reg?.update();
      }
    } catch {
      // تجاهل — الفحص التلقائي عند تحميل الصفحة يغطي
    }
  }, []);

  useEffect(() => {
    // تسجيل الـ Service Worker مع التحكم في لحظة التحديث
    updateSWRef.current = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      // نمنع البانر التلقائي ونحتفظ بالحدث لزر التثبيت المخصص
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };
    const markOnline = () => {
      offlineRef.current = false;
      setIsOffline(false);
    };
    const markOffline = () => {
      offlineRef.current = true;
      setIsOffline(true);
    };
    const recheckConnection = () => {
      if (navigator.onLine) {
        markOnline();
        return;
      }
      void probeOnline().then((online) => {
        if (online) markOnline();
      });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheckConnection();
    };

    // فحص دوري للتحديثات: عند عودة التركيز للتبويب وكل 30 دقيقة
    // حتى يظهر زر "تحديث الموقع" فورًا بعد أي نشر حتى لو الصفحة مفتوحة — دون الحاجة لإعادة التحميل
    const checkNow = () => {
      void forceUpdateCheck();
      void updateSWRef.current?.(false);
    };
    const onFocus = () => {
      checkNow();
      recheckConnection();
    };
    const updateInterval = setInterval(checkNow, 30 * 60 * 1000);
    // ما دام التطبيق يظن أنه بلا اتصال نتحقق كل 15 ثانية — يغطي حدث online المفقود.
    const offlineProbe = setInterval(() => {
      if (!offlineRef.current) return;
      if (navigator.onLine) {
        markOnline();
        return;
      }
      void probeOnline().then((online) => {
        if (online) markOnline();
      });
    }, 15_000);
    if (!navigator.onLine) recheckConnection();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(updateInterval);
      clearInterval(offlineProbe);
    };
  }, [forceUpdateCheck]);

  // تشغيل نافذة تثبيت المتصفح من زرنا المخصص
  const promptInstall = useCallback(async () => {
    if (!installPromptEvent) return false;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome === 'accepted';
  }, [installPromptEvent]);

  // تطبيق التحديث الجاهز (إعادة تحميل الصفحة)
  const applyUpdate = useCallback(() => {
    if (updateSWRef.current) {
      updateSWRef.current(true);
    } else {
      // احتياطي: لو تعذّر الوصول للـ SW نحدّث بالطريقة العادية
      window.location.reload();
    }
  }, []);

  // فحص يدوي لوجود تحديث (يُستخدم من زر "التحقق من التحديثات")
  const checkForUpdates = useCallback(async (): Promise<void> => {
    // أولًا فحص الشبكة لاكتشاف نسخة جديدة، ثم تفعيل أي نسخة منتظرة
    await forceUpdateCheck();
    try {
      await updateSWRef.current?.(false);
    } catch {
      // تجاهل — الفحص التلقائي عند التركيز يغطي
    }
  }, [forceUpdateCheck]);

  return {
    canInstall: Boolean(installPromptEvent) && !isInstalled,
    isInstalled,
    promptInstall,
    needRefresh,
    offlineReady,
    applyUpdate,
    checkForUpdates,
    dismissOfflineReady: () => setOfflineReady(false),
    isOffline,
  };
}
