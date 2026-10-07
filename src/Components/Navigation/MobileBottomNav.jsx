import { FiHome, FiBookmark, FiEdit3, FiList, FiUser, FiShield, FiBook } from 'react-icons/fi';

// شريط التنقل السفلي للموبايل
const MobileBottomNav = ({ currentView, user, isAdminUser, onNavigate, onOpenLogin }) => (
  <div className="mobile-bottom-nav">
    <button
      className={`nav-item ${currentView === 'hero' ? 'active' : ''}`}
      onClick={() => onNavigate('hero')}
    >
      <FiHome size={20} />
      <span>البداية</span>
    </button>
    <button
      className={`nav-item ${['books', 'chapters', 'lessons', 'reading'].includes(currentView) ? 'active' : ''}`}
      onClick={() => onNavigate('books')}
    >
      <FiBook size={20} />
      <span>الفهرس</span>
    </button>
    <button
      className={`nav-item ${currentView === 'bookmarks' ? 'active' : ''}`}
      onClick={() => onNavigate('bookmarks')}
    >
      <FiBookmark size={20} />
      <span>المفضلة</span>
    </button>
    <button
      className={`nav-item ${currentView === 'highlights' ? 'active' : ''}`}
      onClick={() => onNavigate('highlights')}
    >
      <FiEdit3 size={20} />
      <span>الفوائد</span>
    </button>
    {isAdminUser && (
      <button
        className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}
        onClick={() => onNavigate('admin')}
      >
        <FiShield size={20} />
        <span>الإدارة</span>
      </button>
    )}
    <button
      className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
      onClick={() => onNavigate('settings')}
    >
      <FiList size={20} />
      <span>المزيد</span>
    </button>
    <button
      className={`nav-item ${user ? 'active' : ''}`}
      onClick={onOpenLogin}
    >
      <FiUser size={20} />
      <span>{user ? (user.displayName || 'حسابي') : 'دخول'}</span>
    </button>
  </div>
);

export default MobileBottomNav;
