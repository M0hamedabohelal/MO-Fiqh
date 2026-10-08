import { FiHome, FiBookmark, FiEdit3, FiList, FiUser, FiShield, FiBook, FiSearch } from 'react-icons/fi';
import type { User } from 'firebase/auth';

interface MobileBottomNavProps {
  currentView: string;
  user: User | null;
  isAdminUser: boolean;
  onNavigate: (view: string) => void;
  onOpenLogin: () => void;
  onOpenSearch: () => void;
}

// شريط التنقل السفلي للموبايل + زر بحث عائم (يظهر على الشاشات الصغيرة فقط)
const MobileBottomNav = ({ currentView, user, isAdminUser, onNavigate, onOpenLogin, onOpenSearch }: MobileBottomNavProps) => (
  <>
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

  {/* زر البحث العائم — للفون فقط (مخفي على الشاشات الكبيرة) */}
  <button
    className="mobile-search-fab"
    onClick={onOpenSearch}
    title="بحث"
    aria-label="بحث"
  >
    <FiSearch size={22} />
  </button>
  </>
);

export default MobileBottomNav;
