import { useEffect, useState } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import type { AppVersionState } from '../../hooks/useAppVersion';

// بوب «نسخة جديدة متاحة» — يظهر **أسفل الشاشة** فجأة بأنيميشن قصير.
//
// لماذا بوب لا شريط: الشريط العلوي كان يدفع المحتوى ويُقطع مع أول تمرير، والبوب
// يحفظ مساحة شريط التنقل السفلي على الفون ويُقرأ دون أن يقطع القراءة.
//
// مفاتيح السلوك:
// - تأخير 350ms: «يظهر فجأة» بعد استقرار أول رسم، لا يرتجف أثناء الإقلاع.
// - data-reduced-motion: من يفضّل تقليل الحركة يحصل على ظهور بلا انزلاق.
// - role="status" + aria-live: يُعلَن لقارئ الشاشة دون سرقة تركيز.
const APPEAR_DELAY_MS = 350;

const prefersReducedMotion = (): boolean => {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const UpdateBanner = ({ version }: { version: AppVersionState }) => {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  const active = version.updateReady && !version.dismissed;

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(false);
      return undefined;
    }
     
    setReduced(prefersReducedMotion());
    const t = setTimeout(() => setShown(true), APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [active]);

  if (!active || !shown) return null;

  return (
    <div
      className="update-pop update-banner"
      data-placement="bottom"
      data-reduced-motion={reduced ? 'true' : 'false'}
      role="status"
      aria-live="polite"
    >
      <span className="update-pop-icon" aria-hidden="true">
        <FiRefreshCw size={17} />
      </span>

      <div className="update-pop-body">
        <span className="update-pop-title">نسخة جديدة متاحة</span>
        <span className="update-pop-sub">حدّث لتظهر آخر التعديلات</span>
      </div>

      <div className="update-pop-actions">
        <button
          type="button"
          className="update-pop-btn"
          onClick={version.reloadNow}
          disabled={version.reloading}
          aria-label="تحديث الآن — إعادة تحميل الصفحة بالنسخة الجديدة"
        >
          {version.reloading ? 'جارٍ التحديث...' : 'تحديث الآن'}
        </button>
        <button
          type="button"
          className="update-pop-dismiss"
          onClick={version.dismiss}
          disabled={version.reloading}
          aria-label="إغلاق إشعار التحديث"
          title="لاحقًا"
        >
          <FiX size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
