import { useState, useEffect, useCallback } from 'react';

// خدمة تثبيت التطبيق (PWA Install Service)
// تتيح كشف قابلية التثبيت، والتقاط حدث beforeinstallprompt، ودعم إرشادات iOS Safari

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'yasser_pwa_install_dismissed';

export interface PWAInstallState {
  /** هل يمكن تثبيت التطبيق الآن (أندرويد/كروم جاهز للـ prompt أو iOS في المتصفح) */
  isInstallable: boolean;
  /** هل التطبيق يعمل بالفعل كنافذة مستقلة ومثبتة */
  isInstalled: boolean;
  /** هل الجهاز بنظام iOS (يحتاج إرشادات زر المشاركة) */
  isIOS: boolean;
  /** هل أخفى المستخدم تنبيه التثبيت مسبقاً */
  isDismissed: boolean;
  /** إظهار نافذة التثبيت الرسمية للمتصفح */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
  /** إخفاء التنبيه وعدم إزعاجه مجددًا */
  dismissPrompt: () => void;
}

const checkIsIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
};

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandalone || isIOSStandalone;
  });

  const [isIOS] = useState<boolean>(() => checkIsIOS());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // مراقبة الانتقال إلى وضع Standalone
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    // التقاط حدث قبل التثبيت في كروم وأندرويد
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // الاستماع لحدث اكتمال التثبيت
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return choice.outcome;
    } catch {
      return 'unsupported';
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  // يمكن التثبيت إذا كان هناك prompt متوفر أو إذا كان على iOS في المتصفح ولم يثبت بعد
  const isInstallable = !isInstalled && (deferredPrompt !== null || (isIOS && !isDismissed));

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isDismissed,
    promptInstall,
    dismissPrompt,
  };
}
