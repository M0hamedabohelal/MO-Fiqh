import { FiHome, FiEdit3, FiList, FiBook, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import type { User } from 'firebase/auth';
import { triggerHaptic } from '../../utils/haptics';

interface MobileBottomNavProps {
  currentView: string;
  user?: User | null;
  isAdminUser: boolean;
  onNavigate: (view: string) => void;
  onOpenLogin?: () => void;
  onOpenSearch: () => void;
}

/**
 * شريط التنقل السفلي للهاتف — مصمم وفق معايير الجوال الحديثة (Mobile-First)
 * يحتوي على 5 وجهات رئيسية موحدة ذات مساحات لمس مريحة (>= 44px) ومؤشر كبسولي متحرك
 */
const MobileBottomNav = ({
  currentView,
  isAdminUser,
  onNavigate,
  onOpenSearch,
}: MobileBottomNavProps) => {
  const isHeroActive = currentView === 'hero';
  const isIndexActive = ['books', 'chapters', 'lessons', 'reading'].includes(currentView);
  const isSavedActive = ['highlights', 'bookmarks'].includes(currentView);
  const isMoreActive = ['settings', 'admin', 'achievements', 'review'].includes(currentView);

  const handleNav = (view: string) => {
    triggerHaptic('selection');
    onNavigate(view);
  };

  const handleSearch = () => {
    triggerHaptic('light');
    onOpenSearch();
  };

  return (
    <nav aria-label="التنقل الرئيسي" className="mobile-bottom-nav">
      {/* 1. الرئيسة */}
      <button
        type="button"
        className={`nav-item ${isHeroActive ? 'active' : ''}`}
        aria-current={isHeroActive ? 'page' : undefined}
        aria-label="الرئيسة"
        onClick={() => handleNav('hero')}
      >
        {isHeroActive && (
          <motion.span
            layoutId="mobile-nav-pill"
            className="mobile-nav-active-pill"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
        <FiHome size={21} aria-hidden="true" />
        <span>الرئيسة</span>
      </button>

      {/* 2. الفهرس */}
      <button
        type="button"
        className={`nav-item ${isIndexActive ? 'active' : ''}`}
        aria-current={isIndexActive ? 'page' : undefined}
        aria-label="فهرس الكتب والمسائل"
        onClick={() => handleNav('books')}
      >
        {isIndexActive && (
          <motion.span
            layoutId="mobile-nav-pill"
            className="mobile-nav-active-pill"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
        <FiBook size={21} aria-hidden="true" />
        <span>الفهرس</span>
      </button>

      {/* 3. البحث */}
      <button
        type="button"
        className="nav-item nav-item-search"
        aria-label="بحث شامل"
        onClick={handleSearch}
      >
        <FiSearch size={22} aria-hidden="true" />
        <span>بحث</span>
      </button>

      {/* 4. الفوائد والمحفوظات */}
      <button
        type="button"
        className={`nav-item ${isSavedActive ? 'active' : ''}`}
        aria-current={isSavedActive ? 'page' : undefined}
        aria-label="الفوائد والمفضلة"
        onClick={() => handleNav(currentView === 'bookmarks' ? 'bookmarks' : 'highlights')}
      >
        {isSavedActive && (
          <motion.span
            layoutId="mobile-nav-pill"
            className="mobile-nav-active-pill"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
        <FiEdit3 size={21} aria-hidden="true" />
        <span>الفوائد</span>
      </button>

      {/* 5. المزيد والإعدادات */}
      <button
        type="button"
        className={`nav-item ${isMoreActive ? 'active' : ''}`}
        aria-current={isMoreActive ? 'page' : undefined}
        aria-label="المزيد والإعدادات"
        onClick={() => handleNav('settings')}
      >
        {isMoreActive && (
          <motion.span
            layoutId="mobile-nav-pill"
            className="mobile-nav-active-pill"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
        <div className="position-relative d-inline-flex align-items-center justify-content-center">
          <FiList size={21} aria-hidden="true" />
          {isAdminUser && (
            <span
              className="position-absolute top-0 start-100 translate-middle p-1 bg-warning border border-light rounded-circle"
              style={{ width: '8px', height: '8px' }}
              title="مشرف"
              aria-label="مشرف"
            />
          )}
        </div>
        <span>المزيد</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
