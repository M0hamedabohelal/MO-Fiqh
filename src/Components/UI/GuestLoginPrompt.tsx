import { useEffect, useState } from 'react';
import { FiLogIn, FiX } from 'react-icons/fi';
import { onRequireLogin } from '../../utils/guestPrompt';
import type { GuestPromptDetail } from '../../utils/guestPrompt';

// بوب «يلزم تسجيل الدخول» — أسفل الشاشة، بنفس لغة بوب التحديث.
// يظهر حين يحاول زائر حفظ شيء (مفضلة/فائدة/ملاحظة/علامة وقف)، لا عند القراءة.
const AUTO_HIDE_MS = 6500;

interface Props {
  onOpenLogin: () => void;
}

const GuestLoginPrompt = ({ onOpenLogin }: Props) => {
  const [detail, setDetail] = useState<GuestPromptDetail | null>(null);

  useEffect(() => onRequireLogin((d) => setDetail(d)), []);

  // يختفي تلقائيًا كي لا يبقى مزعجًا أثناء القراءة
  useEffect(() => {
    if (!detail) return undefined;
    const t = setTimeout(() => setDetail(null), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [detail]);

  if (!detail) return null;

  return (
    <div className="guest-pop" role="status" aria-live="polite" data-placement="bottom">
      <span className="guest-pop-icon" aria-hidden="true">
        <FiLogIn size={17} />
      </span>

      <div className="guest-pop-body">
        <span className="guest-pop-title">يلزم تسجيل الدخول</span>
        <span className="guest-pop-sub">
          {detail.message ?? `سجّل الدخول ${detail.action ? `لحفظ ${detail.action}` : 'لحفظ بياناتك'} ومزامنتها على كل أجهزتك`}
        </span>
      </div>

      <div className="guest-pop-actions">
        <button
          type="button"
          className="guest-pop-btn"
          onClick={() => { setDetail(null); onOpenLogin(); }}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          className="guest-pop-dismiss"
          onClick={() => setDetail(null)}
          aria-label="إغلاق التنبيه"
          title="لاحقًا"
        >
          <FiX size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default GuestLoginPrompt;
