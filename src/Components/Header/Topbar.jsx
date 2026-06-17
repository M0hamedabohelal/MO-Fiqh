import { FiMoon, FiSun } from 'react-icons/fi';
import { BsBook } from 'react-icons/bs';

const Topbar = ({ fontSize, setFontSize, theme, toggleTheme }) => {
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

    </div>
  );
};

export default Topbar;