import { FiUser, FiArrowUpCircle } from 'react-icons/fi';
import { useApp } from '../Layout/AppContext';

const GuestAccountCard = () => {
  const { user, onOpenLogin } = useApp();

  if (user) return null;

  return (
    <div className="custom-card p-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2">
        <FiUser size={24} style={{ color: 'var(--accent-color)' }} />
        <div>
          <div className="fw-bold" style={{ color: 'var(--text-main)' }}>
            حساب زائر
          </div>
          <small className="text-muted">تقدمك محفوظ على هذا الجهاز فقط</small>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenLogin}
        className="btn d-flex align-items-center gap-2 border-0 px-3 py-2"
        style={{
          color: 'var(--primary-color)',
          fontWeight: 'bold',
          background: 'transparent',
        }}
      >
        <FiArrowUpCircle size={18} />
        ترقية الحساب وحفظ التقدم الدائم
      </button>
    </div>
  );
};

export default GuestAccountCard;
