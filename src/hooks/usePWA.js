import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * إدارة حالة التطبيق المثبت (PWA):
 * - زر التثبيت المخصص عبر حدث beforeinstallprompt
 * - إشعار "تحديث جديد جاهز" من الـ Service Worker
 * - مؤشر العمل بدون إنترنت
 */
export function usePWA() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  const updateSWRef = useRef(null);

  useEffect(() => {
    // تسجيل الـ Service Worker مع التحكم في لحظة التحديث
    updateSWRef.current = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });

    const handleBeforeInstallPrompt = (event) => {
      // نمنع البانر التلقائي ونحتفظ بالحدث لزر التثبيت المخصص
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
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
