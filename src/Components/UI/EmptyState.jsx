// بطاقة الحالة الفارغة الموحدة لكل الشاشات
const EmptyState = ({ icon: Icon, title, message, children }) => (
  <div className="text-center p-5 custom-card">
    <Icon size={48} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
    {title && <h5 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>{title}</h5>}
    {message && <p className="text-muted mb-0">{message}</p>}
    {children}
  </div>
);

export default EmptyState;
