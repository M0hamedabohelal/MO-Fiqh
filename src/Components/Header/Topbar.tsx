import { useState } from 'react';
import { FiMoon, FiBell, FiWifiOff } from 'react-icons/fi';
import { BsBook } from 'react-icons/bs';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import AnnouncementsModal from '../UI/AnnouncementsModal';
import { useApp } from '../Layout/AppContext';

interface TopbarProps {
  theme: string;
  toggleTheme: (theme: string) => void;
}

const Topbar = ({ theme, toggleTheme }: TopbarProps) => {
  const { announcements, unreadCount, markAsRead, refresh } = useAnnouncements();
  const { isOffline } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      {/* حالة الاتصال: إشارة صريحة عند الانقطاع بأن المحفوظ على الجهاز متاح */}
      {isOffline && (
        <span
          className="d-inline-flex align-items-center gap-1 ms-2 offline-indicator"
          style={{ color: '#e74c3c', fontSize: '0.78rem', fontWeight: 600 }}
          role="status"
          title="لا يوجد اتصال — المحتوى المحفوظ على الجهاز متاح، وأي تعديل يُحفظ محليًا"
        >
          <FiWifiOff size={16} /> غير متصل
        </span>
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
