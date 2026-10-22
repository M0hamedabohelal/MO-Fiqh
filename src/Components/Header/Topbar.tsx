import { useState } from 'react';
import { FiMoon, FiBell, FiWifiOff } from 'react-icons/fi';
import { BsBook } from 'react-icons/bs';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import AnnouncementsModal from '../UI/AnnouncementsModal';
import type { StopMarksSyncState } from '../../hooks/useStopMarks';
import type { LibrarySyncState } from '../../hooks/useUserLibrary';

interface TopbarProps {
  theme: string;
  toggleTheme: (theme: string) => void;
  cloudStatus: string;
  librarySyncState: LibrarySyncState;
  isSignedIn: boolean;
  stopMarksSyncState: StopMarksSyncState;
  isOffline: boolean;
  onRetryCloud: () => Promise<boolean>;
  onRetryLibrary: () => void;
  onRetryStopMarks: () => void;
}

const Topbar = ({ theme, toggleTheme, cloudStatus, librarySyncState, isSignedIn, stopMarksSyncState, isOffline, onRetryCloud, onRetryLibrary, onRetryStopMarks }: TopbarProps) => {
  const { announcements, unreadCount, markAsRead, refresh } = useAnnouncements();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retryingCloud, setRetryingCloud] = useState(false);

  // خطأ السحابة في الأعلى قابل للضغط: إعادة المحاولة من نفس المكان بدل البحث عن زر الإعدادات.
  const handleRetryCloud = async (): Promise<void> => {
    if (retryingCloud) return;
    setRetryingCloud(true);
    try {
      await onRetryCloud();
    } finally {
      setRetryingCloud(false);
    }
  };

  const handleOpenAnnouncements = () => {
    refresh();
    setIsModalOpen(true);
    markAsRead();
  };

  // دالة للتبديل بين الوضعين فقط: داكن <-> تراثي (الفاتح محذوف)
  const cycleTheme = () => {
    if (theme === 'sepia') toggleTheme('dark');
    else toggleTheme('sepia');
  };

  const getThemeIcon = () => {
    if (theme === 'sepia') return <BsBook size={20} />;
    return <FiMoon size={20} />;
  };

  const getThemeLabel = () => {
    if (theme === 'sepia') return 'تراثي';
    return 'داكن';
  };

  // مؤشر حالة المزامنة مع السحابة
  const getCloudIndicator = () => {
    if (cloudStatus === 'syncing') {
      return { icon: '⟳', label: 'جارٍ تحديث المسائل', title: 'جارٍ جلب أحدث المسائل من السحابة', color: '#f39c12' };
    }
    if (cloudStatus === 'synced') {
      return { icon: '✓', label: 'المسائل محدّثة', title: 'المسائل محمّلة من السحابة', color: '#27ae60' };
    }
    if (cloudStatus === 'available') {
      return { icon: '✓', label: 'المسائل جاهزة', title: 'المسائل المحمّلة متاحة؛ يمكنك طلب تحديثها من الإعدادات', color: '#27ae60' };
    }
    // عند انقطاع الاتصال تظهر أيقونة الواي فاي المشطوبة منفصلة — نتفادى تكرار الدلالة
    if (cloudStatus === 'offline' && !isOffline) {
      return { icon: '⚠', label: 'تعذر تحديث المسائل', title: 'تعذر الوصول إلى المسائل على السحابة؛ النسخة المحفوظة متاحة', color: '#e74c3c' };
    }
    if (cloudStatus === 'local') {
      return { icon: '●', label: 'المسائل محلية', title: 'يعمل التطبيق بالنسخة المحلية من المسائل', color: '#a77c2d' };
    }
    return null;
  };

  const cloud = getCloudIndicator();

  return (
    <>
    <div className="topbar-row d-flex justify-content-start align-items-center mb-3 gap-1 flex-wrap">
      <button
        className="btn btn-link d-flex align-items-center gap-1 position-relative"
        style={{ color: 'var(--text-main)', textDecoration: 'none' }}
        onClick={handleOpenAnnouncements}
        title="الإشعارات"
        aria-label="فتح الإشعارات"
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
            {unreadCount}
          </span>
        )}
      </button>

      <button
        className="btn btn-link d-flex align-items-center gap-1 ms-2"
        style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.85rem' }}
        onClick={cycleTheme}
        title={`الوضع الحالي: ${getThemeLabel()}`}
        aria-label={`تبديل المظهر — الحالي: ${getThemeLabel()}`}
      >
        {getThemeIcon()}
        <span className="d-none d-md-inline">{getThemeLabel()}</span>
      </button>

      {isOffline && (
        <span
          className="d-inline-flex align-items-center ms-2 offline-indicator"
          style={{ color: '#e74c3c', fontSize: '1.05rem' }}
          aria-label="غير متصل بالإنترنت؛ المحتوى المحمّل متاح والتغييرات الشخصية محفوظة محليًا"
          role="status"
          title="غير متصل — ستُحفظ تغييراتك على الجهاز وتُزامن عند عودة الاتصال"
        >
          <FiWifiOff size={20} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>غير متصل — التغييرات محفوظة</span>
        </span>
      )}

      {cloud && (cloudStatus === 'offline' && !isOffline ? (
        <button
          type="button"
          className="btn btn-link p-0 ms-auto d-flex align-items-center gap-1"
          style={{ color: cloud.color, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
          aria-label={`${cloud.label} — اضغط لإعادة المحاولة`}
          title="اضغط لإعادة محاولة تحميل المسائل من السحابة"
          onClick={() => { void handleRetryCloud(); }}
          disabled={retryingCloud}
        >
          {retryingCloud
            ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            : <span style={{ fontSize: '0.85rem' }}>{cloud.icon}</span>}
          <span>{retryingCloud ? 'جارٍ إعادة المحاولة...' : cloud.label}</span>
        </button>
      ) : (
        <span
          className="ms-auto d-flex align-items-center gap-1"
          style={{ color: cloud.color, fontSize: '0.78rem', fontWeight: 600 }}
          role="status"
          aria-label={`${cloud.label} — ${cloud.title}`}
          title={cloud.title}
        >
          <span style={{ fontSize: '0.85rem' }}>{cloud.icon}</span>
          <span>{cloud.label}</span>
        </span>
      ))}

      {isSignedIn && librarySyncState === 'pending' && (
        <span className="d-flex align-items-center gap-1" style={{ color: '#f39c12', fontSize: '0.78rem', fontWeight: 600 }} role="status" title="تغييرات المكتبة محفوظة على الجهاز وستُرفع عند توفر الاتصال">
          <span aria-hidden="true">⟳</span><span>تغييرات محفوظة محليًا</span>
        </span>
      )}
      {isSignedIn && librarySyncState === 'syncing' && (
        <span className="d-flex align-items-center gap-1" style={{ color: '#f39c12', fontSize: '0.78rem', fontWeight: 600 }} role="status" title="جارٍ رفع التغييرات الشخصية إلى الحساب">
          <span aria-hidden="true">⟳</span><span>جارٍ مزامنة المكتبة</span>
        </span>
      )}
      {isSignedIn && librarySyncState === 'error' && (
        <button
          type="button"
          className="btn btn-link p-0 d-flex align-items-center gap-1"
          style={{ color: '#e74c3c', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
          title="تعذرت مزامنة المكتبة؛ التغييرات ما زالت محفوظة على الجهاز — اضغط لإعادة المحاولة"
          onClick={onRetryLibrary}
        >
          <span aria-hidden="true">⚠</span><span>تعذرت مزامنة المكتبة</span>
        </button>
      )}
      {isSignedIn && librarySyncState === 'offline' && !isOffline && (
        <button
          type="button"
          className="btn btn-link p-0 d-flex align-items-center gap-1"
          style={{ color: '#e74c3c', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
          title="لم نتمكن من تأكيد مزامنة بيانات الحساب. بياناتك محفوظة على هذا الجهاز — اضغط لإعادة المحاولة"
          onClick={onRetryLibrary}
        >
          <span aria-hidden="true">⚠</span><span>مزامنة الحساب غير مؤكدة</span>
        </button>
      )}

      {stopMarksSyncState === 'pending' && (
        <span className="ms-auto d-flex align-items-center gap-1" style={{ color: '#f39c12', fontSize: '0.78rem', fontWeight: 600 }} role="status" title="علامة الوقوف محفوظة محليًا وبانتظار مزامنتها">
          <span aria-hidden="true">⟳</span>
          <span className="d-none d-sm-inline">مزامنة العلامة</span>
        </span>
      )}
      {stopMarksSyncState === 'error' && (
        <button
          type="button"
          className="btn btn-link p-0 ms-auto d-flex align-items-center gap-1"
          style={{ color: '#e74c3c', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
          title="تعذرت مزامنة علامة الوقوف — اضغط لإعادة المحاولة"
          onClick={onRetryStopMarks}
        >
          <span aria-hidden="true">⚠</span>
          <span className="d-none d-sm-inline">تعذرت مزامنة العلامة</span>
        </button>
      )}
    </div>
    {isModalOpen && (
      <AnnouncementsModal
        announcements={announcements}
        onClose={() => setIsModalOpen(false)}
      />
    )}
    </>
  );
};

export default Topbar;
