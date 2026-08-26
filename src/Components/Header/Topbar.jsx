import { FiMoon, FiSun } from 'react-icons/fi';
import { BsBook } from 'react-icons/bs';

const Topbar = ({ setFontSize, theme, toggleTheme, cloudStatus }) => {
  const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 14));

  // دالة للتبديل بين الأوضاع الثلاثة: فاتح -> سيبيا -> داكن -> فاتح
  const cycleTheme = () => {
    if (theme === 'light') toggleTheme('sepia');
    else if (theme === 'sepia') toggleTheme('dark');
    else toggleTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <FiMoon size={20} />;
    if (theme === 'sepia') return <BsBook size={20} />;
    return <FiSun size={20} />;
  };

  const getThemeLabel = () => {
    if (theme === 'dark') return 'داكن';
    if (theme === 'sepia') return 'ورقي';
    return 'فاتح';
  };

  // مؤشر حالة المزامنة مع السحابة
  const getCloudIndicator = () => {
    if (cloudStatus === 'syncing') {
      return { icon: '⟳', label: 'جاري المزامنة', title: 'جاري سحب أحدث البيانات من السحابة', color: '#f39c12' };
    }
    if (cloudStatus === 'synced') {
      return { icon: '✓', label: 'متزامن', title: 'البيانات محدثة من السحابة', color: '#27ae60' };
    }
    if (cloudStatus === 'offline') {
      return { icon: '⚠', label: 'بدون اتصال', title: 'تعذر الوصول للسحابة — تعرض البيانات المحلية', color: '#e74c3c' };
    }
    return null;
  };

  const cloud = getCloudIndicator();

  return (
    <div className="d-flex justify-content-start align-items-center mb-3 gap-1 flex-wrap">
      <button className="btn btn-link text-decoration-none" style={{ color: 'var(--text-main)' }} onClick={decreaseFont}>A-</button>
      <button className="btn btn-link text-decoration-none fw-bold fs-5" style={{ color: 'var(--text-main)' }} onClick={increaseFont}>A+</button>
      
      <button 
        className="btn btn-link d-flex align-items-center gap-1" 
        style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.85rem' }} 
        onClick={cycleTheme}
        title={`الوضع الحالي: ${getThemeLabel()}`}
      >
        {getThemeIcon()}
        <span className="d-none d-md-inline">{getThemeLabel()}</span>
      </button>

      {cloud && (
        <span
          className="ms-auto d-flex align-items-center gap-1"
          style={{ color: cloud.color, fontSize: '0.78rem', fontWeight: 600 }}
          title={cloud.title}
        >
          <span style={{ fontSize: '0.85rem' }}>{cloud.icon}</span>
          <span className="d-none d-sm-inline">{cloud.label}</span>
        </span>
      )}

    </div>
  );
};

export default Topbar;