import { useEffect, useState } from 'react';

// شاشة التحميل: حد أقصى ثانيتين، وتختفي سريعًا بعد جاهزية المصادقة
export function useSplash(authLoading: boolean): boolean {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const maxTimer = setTimeout(() => setShowSplash(false), 2000);
    if (!authLoading) {
      clearTimeout(maxTimer);
      const minTimer = setTimeout(() => setShowSplash(false), 350);
      return () => clearTimeout(minTimer);
    }
    return () => clearTimeout(maxTimer);
  }, [authLoading]);

  return showSplash;
}
