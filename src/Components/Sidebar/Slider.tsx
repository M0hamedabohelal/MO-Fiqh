import { FiBook, FiList, FiFileText, FiSearch, FiSettings, FiBookmark, FiEdit3, FiUser, FiShield, FiAward } from 'react-icons/fi';
import type { User } from 'firebase/auth';
import logo from '../../assets/logo-circle.webp';
import logo128 from '../../assets/logo-circle-128.webp';
import logo256 from '../../assets/logo-circle-256.webp';
import './Slider.css';

interface SliderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
  user: User | null;
  isAdminUser: boolean;
}

const Slider = ({ activeView, setActiveView, onOpenSearch, onOpenLogin, user, isAdminUser }: SliderProps) => {

  return (
    <aside aria-label="الشريط الجانبي للتنقل" className="sidebar-wrapper">

      <div className="sidebar-logo-section">
        <button
          onClick={() => setActiveView('hero')}
          className="sidebar-logo-link"
          title="الرجوع للصفحة الرئيسية"
          aria-label="الرجوع للصفحة الرئيسية"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <img
            src={logo256}
            srcSet={`${logo128} 128w, ${logo256} 256w, ${logo} 640w`}
            sizes="100px"
            alt="شعار يَسِّر"
            className="sidebar-logo-img"
            width="100"
            height="100"
            decoding="async"
          />
        </button>
        <span className="sidebar-tagline">دراسة وتدبر</span>
      </div>

      <ul className="sidebar-nav">
        <li className="sidebar-nav-item">
          <button
            className={`sidebar-btn ${activeView === 'books' ? 'sidebar-btn-active' : ''}`}
            onClick={() => {
              window.history.replaceState(null, '', '#/hero');
              window.history.pushState(null, '', '#/books');
              setActiveView('books');
            }}
          >
            <FiBook className="sidebar-btn-icon" size={22} /> الكتب
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button
            className={`sidebar-btn ${activeView === 'chapters' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('chapters')}
          >
            <FiList className="sidebar-btn-icon" size={22} /> الفصول
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button
            className={`sidebar-btn ${activeView === 'lessons' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('lessons')}
          >
            <FiFileText className="sidebar-btn-icon" size={22} /> المسائل
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button
            className={`sidebar-btn ${activeView === 'bookmarks' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('bookmarks')}
          >
            <FiBookmark className="sidebar-btn-icon" size={22} /> المفضلة
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button
            className={`sidebar-btn ${activeView === 'highlights' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('highlights')}
          >
            <FiEdit3 className="sidebar-btn-icon" size={22} /> الفوائد المقتبسة
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button
            className={`sidebar-btn ${activeView === 'achievements' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('achievements')}
          >
            <FiAward className="sidebar-btn-icon" size={22} /> إنجازاتي
          </button>
        </li>
        {isAdminUser && (
          <li className="sidebar-nav-item">
            <button
              className={`sidebar-btn ${activeView === 'admin' ? 'sidebar-btn-active' : ''}`}
              onClick={() => setActiveView('admin')}
            >
              <FiShield className="sidebar-btn-icon" size={22} /> لوحة الإدارة
            </button>
          </li>
        )}
      </ul>

      <div className="sidebar-footer">
        <button
          className="sidebar-search-btn"
          onClick={onOpenSearch}
        >
          <FiSearch size={20} /> بحث شامل
        </button>

        <button
          className="sidebar-login-btn"
          onClick={onOpenLogin}
          title={user ? `حساب: ${user.displayName || user.email}` : 'تسجيل الدخول'}
        >
          <FiUser size={20} />
          {user ? (user.displayName || user.email || 'حسابي') : 'تسجيل الدخول'}
        </button>

        <ul className="sidebar-secondary-nav">
          <li className="sidebar-nav-item">
            <button
              className={`sidebar-settings-btn ${activeView === 'settings' ? 'sidebar-settings-active' : ''}`}
              onClick={() => setActiveView('settings')}
            >
              <FiSettings className="sidebar-btn-icon" size={22} /> الإعدادات
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Slider;
