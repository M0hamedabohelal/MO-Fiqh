import { useEffect, useRef, useState } from 'react';
import { FiWifiOff } from 'react-icons/fi';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './offline-banner.css';

// ─── E4: شريط فقد الاتصال ───
// يظهر بلا مزايدة فوق المحتوى (sticky) بدل رسالة خطأ كاملة: القراءة المحفوظة تعمل،
// والمستخدم يحتاج فقط أن يعرف أن التغييرات لم تُزامَن بعد. عند العودة: تأكيد واحد قصير.

export interface OfflineBannerProps {
  /** عند عودة الاتصال — تستخدمه AppLayout لإعادة جلب ما فشل */
  onReconnected?: () => void;
}

export const OfflineBanner = ({ onReconnected }: OfflineBannerProps) => {
  const isOffline = useOnlineStatus();
  const wasOffline = useRef(isOffline);
  const [recentlyBack, setRecentlyBack] = useState(false);

  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      return undefined;
    }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    setRecentlyBack(true);
    onReconnected?.();
    const t = setTimeout(() => setRecentlyBack(false), 3200);
    return () => clearTimeout(t);
  }, [isOffline, onReconnected]);

  if (isOffline) {
    return (
      <div className="offline-banner" role="status" aria-live="polite">
        <FiWifiOff size={15} aria-hidden="true" />
        <span>أنت غير متصل — القراءة المحفوظة تعمل، والتغييرات ستُزامَن عند عودة الاتصال.</span>
      </div>
    );
  }

  if (recentlyBack) {
    return (
      <div className="offline-banner" data-state="back" role="status" aria-live="polite">
        <span>عاد الاتصال — جارٍ استكمال ما فُقد.</span>
      </div>
    );
  }

  return null;
};

