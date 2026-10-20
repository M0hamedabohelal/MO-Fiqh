import { useEffect, useRef, useState } from 'react';

// شاشة الإقلاع: تبقى طالما المصادقة لم تجهز أو مزامنة المحتوى جارية.
// - حد أدنى (500ms) لمنع وميض سريع.
// - حد أقصى (7 ثوانٍ) أمانًا: لو تعطّلت المزامنة لا نحبس المستخدم في الشاشة.
// - progress: قيمة مُحاكاة تتقدّم بتباطؤ نحو 92% أثناء الانتظار، ثم تقفز إلى 100% عند الجاهزية.
export const SPLASH_MIN_MS = 500;
export const SPLASH_MAX_MS = 7000;
export const SPLASH_PROGRESS_CEIL = 92;

// خطوة التقدّم المُحاكى: تقارب أسّي نحو السقف فلا تتجاوز 92% أبدًا (منطق نقي قابل للاختبار)
export function nextProgress(current: number): number {
  if (current >= SPLASH_PROGRESS_CEIL) return current;
  return Math.min(SPLASH_PROGRESS_CEIL, current + (SPLASH_PROGRESS_CEIL - current) * 0.08 + 0.35);
}

// زمن الإخفاء بعد الجاهزية: يحقق الحد الأدنى من لحظة البدء، ولا ينتظر إن انقضى
export function hideDelay(elapsedMs: number): number {
  return Math.max(SPLASH_MIN_MS - elapsedMs, 0);
}

export interface SplashState {
  visible: boolean;
  progress: number;
}

export function useSplash(authLoading: boolean, contentSyncing: boolean): SplashState {
  const ready = !authLoading && !contentSyncing;
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(7);
  const startRef = useRef(0);

  // تثبيت لحظة البدء بعد التركيب (Date.now خارج الرسم حفاظًا على نقاء الخاطف)
  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  // تقدّم مُحاكى: يقترب بتباطؤ من 92% أثناء الانتظار (منحنى asymptotic) فلا يتجمّد ولا يبدو كاذبًا
  useEffect(() => {
    if (!ready) {
      const id = setInterval(() => {
        setProgress((p) => nextProgress(p));
      }, 180);
      return () => clearInterval(id);
    }
    return undefined;
  }, [ready]);

  // عند الجاهزية: ابلغ 100% ثم اخفِ الشاشة بعد بلوغ الحد الأدنى
  useEffect(() => {
    if (!ready) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(100);
    const t = setTimeout(() => setVisible(false), hideDelay(Date.now() - startRef.current));
    return () => clearTimeout(t);
  }, [ready]);

  // حد أقصى أمان مستقل — يضمن عدم التعليق مهما حدث
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), SPLASH_MAX_MS);
    return () => clearTimeout(t);
  }, []);

  return { visible, progress };
}
