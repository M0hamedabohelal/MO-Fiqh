import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

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
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    // فحص دوري للتحديثات: عند عودة التركيز للتبويب وكل 30 دقيقة
    // حتى يظهر زر "تحديث الموقع" فورًا بعد أي نشر حتى لو الصفحة مفتوحة
    const onFocus = () => updateSWRef.current?.(false);
    const updateInterval = setInterval(() => updateSWRef.current?.(false), 30 * 60 * 1000);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('focus', onFocus);
      clearInterval(updateInterval);
    };
  }, []);

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
    updateSWRef.current?.(true);
  }, []);

  return {
    canInstall: Boolean(installPromptEvent) && !isInstalled,
    isInstalled,
    promptInstall,
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissOfflineReady: () => setOfflineReady(false),
    isOffline,
  };
}
