// ReadingProgressBar — شريط تقدم القراءة
// يتتبع موضع التمرير في صفحة القراءة ويعرض نسبة مئوية
// يعمل بشكل موحد على كل الشاشات (ديسكتوب/تابلت/موبايل): يحسب على عنصر التمرير الفعلي
// ويعيد الحساب عند أي تغيّر في حجم المحتوى (فتح "قراءة المزيد"، تحميل النصوص، تغيّر الشاشة)
import { useState, useEffect } from 'react';

const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // نحدد عنصر التمرير الفعلي: document أو body أو أول حاوية قابلة للتمرير كبيرة
    const compute = () => {
      const sc = document.scrollingElement || document.documentElement;
      const scrollTop = window.scrollY || sc.scrollTop || 0;
      const scrollHeight = sc.scrollHeight - sc.clientHeight;
      let pct;
      if (scrollHeight <= 0) {
        // لا يوجد تمرير (محتوى أقصر من الشاشة) — تمت قراءة كل شيء
        pct = 100;
      } else {
        pct = Math.min(100, (scrollTop / scrollHeight) * 100);
      }
      setProgress(pct);
    };

    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    window.addEventListener('load', compute);

    // إعادة الحساب عند أي تغيّر في حجم المحتوى (توسيع/تحميل/خطوط) حتى لا يقف الشريط مبكرًا
    let ro: ResizeObserver | null = null;
    try {
      const target = document.body;
      ro = new ResizeObserver(() => compute());
      ro.observe(target);
    } catch {
      ro = null;
    }

    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
      window.removeEventListener('load', compute);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '3px',
        zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--accent-color) 100%)',
          transition: 'width 0.1s linear',
          boxShadow: '0 0 8px rgba(251,220,153,0.6)',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
};

export default ReadingProgressBar;
