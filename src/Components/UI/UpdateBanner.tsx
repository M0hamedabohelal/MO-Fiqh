import { FiRefreshCw, FiX } from 'react-icons/fi';
import type { AppVersionState } from '../../hooks/useAppVersion';

// شريط «نسخة جديدة متاحة» — يظهر تلقائيًا عند نشر تحديث، ويختفي بتحميل الصفحة
// أو بالإخفاء اليدوي لهذه الجلسة. بلا Service Worker: مجرد مقارنة اسم الحزمة.
const UpdateBanner = ({ version }: { version: AppVersionState }) => {
  if (!version.updateReady || version.dismissed) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner-text">نسخة جديدة متاحة</span>
      <div className="update-banner-actions">
        <button
          type="button"
          className="update-banner-btn"
          onClick={version.reloadNow}
          aria-label="تحديث الآن — إعادة تحميل الصفحة بالنسخة الجديدة"
        >
          <FiRefreshCw size={15} aria-hidden="true" /> تحديث الآن
        </button>
        <button
          type="button"
          className="update-banner-dismiss"
          onClick={version.dismiss}
          aria-label="إخفاء إشعار التحديث"
          title="لاحقًا"
        >
          <FiX size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
