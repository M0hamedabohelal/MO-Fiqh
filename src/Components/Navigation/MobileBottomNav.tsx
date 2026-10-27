import { FiHome, FiEdit3, FiList, FiBook, FiSearch } from 'react-icons/fi';
import type { User } from 'firebase/auth';

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
 * يحتوي على 5 وجهات رئيسية موحدة ذات مساحات لمس مريحة (>= 44px) دون ازدحام
 */
const MobileBottomNav = ({
  currentView,
  isAdminUser,
  onNavigate,
  onOpenSearch,
}: MobileBottomNavProps) => {
  const isIndexActive = ['books', 'chapters', 'lessons', 'reading'].includes(currentView);
  const isSavedActive = ['highlights', 'bookmarks'].includes(currentView);
  const isMoreActive = ['settings', 'admin', 'achievements', 'review'].includes(currentView);

  return (
    <nav aria-label="التنقل الرئيسي" className="mobile-bottom-nav">
      {/* 1. الرئيسة */}
      <button
        type="button"
        className={`nav-item ${currentView === 'hero' ? 'active' : ''}`}
        aria-current={currentView === 'hero' ? 'page' : undefined}
        aria-label="الرئيسة"
        onClick={() => onNavigate('hero')}
      >
        <FiHome size={21} aria-hidden="true" />
        <span>الرئيسة</span>
      </button>

      {/* 2. الفهرس */}
      <button
        type="button"
        className={`nav-item ${isIndexActive ? 'active' : ''}`}
        aria-current={isIndexActive ? 'page' : undefined}
        aria-label="فهرس الكتب والمسائل"
        onClick={() => onNavigate('books')}
      >
        <FiBook size={21} aria-hidden="true" />
        <span>الفهرس</span>
      </button>

      {/* 3. البحث (مدمج في المنتصف بدلاً من الزر العائم الحا Ahora) */}
      <button
        type="button"
        className="nav-item nav-item-search"
        aria-label="بحث شامل"
        onClick={onOpenSearch}
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
        onClick={() => onNavigate(currentView === 'bookmarks' ? 'bookmarks' : 'highlights')}
      >
        <FiEdit3 size={21} aria-hidden="true" />
        <span>الفوائد</span>
      </button>

      {/* 5. المزيد والإعدادات */}
      <button
        type="button"
        className={`nav-item ${isMoreActive ? 'active' : ''}`}
        aria-current={isMoreActive ? 'page' : undefined}
        aria-label="المزيد والإعدادات"
        onClick={() => onNavigate('settings')}
      >
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
