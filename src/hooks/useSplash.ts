import { useEffect, useState } from 'react';

// شاشة الإقلاع: تبقى طالما المصادقة لم تجهز أو مزامنة المحتوى جارية.
// - حد أدنى بسيط (400ms) لمنع وميض سريع.
// - حد أقصى (6 ثوانٍ) أمانًا: لو تعطّلت المزامنة لا نحبس المستخدم في الشاشة.
const MIN_MS = 400;
const MAX_MS = 6000;

export function useSplash(authLoading: boolean, contentSyncing: boolean): boolean {
  const [showSplash, setShowSplash] = useState(true);
  const ready = !authLoading && !contentSyncing;

  useEffect(() => {
    // مؤقتات مستقلة عن تبعية ready كي لا تُعاد تهيئتها عند كل تغيّر
    const maxTimer = setTimeout(() => setShowSplash(false), MAX_MS);
    const start = Date.now();
    let minTimer: ReturnType<typeof setTimeout> | undefined;
    if (ready) {
      const elapsed = Date.now() - start;
      minTimer = setTimeout(() => setShowSplash(false), Math.max(0, MIN_MS - elapsed));
    }
    return () => {
      clearTimeout(maxTimer);
      if (minTimer) clearTimeout(minTimer);
    };
  }, [ready]);

  return showSplash;
}
