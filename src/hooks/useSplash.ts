import { useEffect, useRef, useState } from 'react';

// شاشة الإقلاع: تبقى طالما المصادقة لم تجهز أو مزامنة المحتوى جارية.
// - حد أدنى (500ms) لمنع وميض سريع.
// - حد أقصى (7 ثوانٍ) أمانًا: لو تعطّلت المزامنة لا نحبس المستخدم في الشاشة.
// - progress: قيمة مُحاكاة تتقدّم بتباطؤ نحو 90% أثناء الانتظار، ثم تقفز إلى 100% عند الجاهزية.
const MIN_MS = 500;
const MAX_MS = 7000;

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
        setProgress((p) => (p >= 92 ? p : Math.min(92, p + (92 - p) * 0.08 + 0.35)));
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
    const elapsed = Date.now() - startRef.current;
    const wait = Math.max(MIN_MS - elapsed, 420);
    const t = setTimeout(() => setVisible(false), wait);
    return () => clearTimeout(t);
  }, [ready]);

  // حد أقصى أمان مستقل — يضمن عدم التعليق مهما حدث
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), MAX_MS);
    return () => clearTimeout(t);
  }, []);

  return { visible, progress };
}
