import { useEffect, useState } from 'react';
import { probeOnline } from '../utils/connectivity';

// حالة الاتصال بالشبكة — لموقع عادي (بدون أي طبقة تطبيق مثبّت).
// navigator.onLine غير موثوق في متصفحات الجوال، لذا نتحقق فعليًا عند الشك فقط.
export function useOnlineStatus(): boolean {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const verify = () => {
      if (navigator.onLine) {
        setIsOffline(false);
        return;
      }
      void probeOnline(3_000).then((online) => setIsOffline(!online));
    };

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    verify();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}
