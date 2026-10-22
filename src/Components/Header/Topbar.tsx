import { useState } from 'react';
import { FiMoon, FiBell } from 'react-icons/fi';
import { BsBook } from 'react-icons/bs';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import AnnouncementsModal from '../UI/AnnouncementsModal';
import SyncIndicator from '../UI/SyncIndicator';
import type { UnifiedSyncState } from '../../utils/syncStatus';

interface TopbarProps {
  theme: string;
  toggleTheme: (theme: string) => void;
  /** العلامة الموحّدة: كل مسارات المزامنة (المحتوى/المكتبة/العلامة/المشرف) مجمّعة في حالة واحدة */
  syncState: UnifiedSyncState;
  onRetrySync: () => Promise<boolean>;
}

const Topbar = ({ theme, toggleTheme, syncState, onRetrySync }: TopbarProps) => {
  const { announcements, unreadCount, markAsRead, refresh } = useAnnouncements();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // العلامة الوحيدة: الضغط عليها (عند التعذّر) يعيد كل المسارات معًا — لا أزرار مزامنة متفرقة.
  const handleRetry = async (): Promise<void> => {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetrySync();
    } finally {
      setRetrying(false);
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

      {/* العلامة الوحيدة للمزامنة — لا مؤشرات أخرى في أي مكان بالواجهة */}
      <div className="ms-auto">
        <SyncIndicator state={syncState} onRetry={handleRetry} retrying={retrying} compact />
      </div>
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
