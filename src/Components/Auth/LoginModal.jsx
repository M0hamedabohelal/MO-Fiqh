// نافذة تسجيل الدخول / إنشاء حساب
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiLogIn, FiUserPlus, FiMail, FiLock, FiUser, FiLogOut } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from './AuthContext';

const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, login, loginWithGoogle, register, logout, authError, isFirebaseConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    let res;
    if (mode === 'login') {
      res = await login(email, password);
    } else {
      res = await register(email, password, displayName);
    }
    setBusy(false);
    if (res.success) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleBusy(true);
    const res = await loginWithGoogle();
    setGoogleBusy(false);
    if (res.success) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const inputStyle = {
    backgroundColor: 'var(--badge-bg)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    paddingRight: '42px',
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, padding: '20px' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="custom-card p-4 w-100"
        style={{ maxWidth: '440px', zIndex: 1101, backgroundColor: 'var(--card-bg)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
          <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
            {user ? 'حسابك' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h5>
          <button className="btn text-muted" onClick={onClose} title="إغلاق">
            <FiX size={24} />
          </button>
        </div>

        {!isFirebaseConfigured && (
          <div className="alert alert-warning small">
            خدمة الحسابات غير مفعّلة حالياً — تأكد من إعداد ملف .env.local بمفاتيح Firebase.
          </div>
        )}

        {/* المستخدم مسجل دخول بالفعل */}
        {user ? (
          <div>
            <div className="text-center mb-4">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle shadow-sm"
                style={{
                  width: '72px',
                  height: '72px',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--primary-color)',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                }}
              >
                {(user.displayName || user.email || '؟').charAt(0)}
              </div>
              <h6 className="fw-bold" style={{ color: 'var(--text-main)' }}>
                {user.displayName || 'مستخدم'}
              </h6>
              <small className="text-muted">{user.email}</small>
            </div>
            <p className="text-muted small text-center">
              مفضلتك وفوائدك وملاحظاتك محفوظة ومتزامنة عبر أجهزتك تلقائياً.
            </p>
            <button
              className="btn w-100 d-flex align-items-center justify-content-center gap-2"
              style={{ backgroundColor: '#e74c3c', color: 'white', borderRadius: '10px', fontWeight: 'bold' }}
              onClick={handleLogout}
            >
              <FiLogOut /> تسجيل الخروج
            </button>
          </div>
        ) : (
          /* نموذج الدخول / التسجيل */
          <form onSubmit={handleSubmit}>
            {authError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {authError}
              </div>
            )}

            {mode === 'register' && (
              <div className="mb-3 position-relative">
                <FiUser className="position-absolute" style={{ top: '12px', right: '14px', zIndex: 5, color: 'var(--primary-color)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="اسمك (اختياري)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            <div className="mb-3 position-relative">
              <FiMail className="position-absolute" style={{ top: '12px', right: '14px', zIndex: 5, color: 'var(--primary-color)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                style={{ ...inputStyle, textAlign: 'left', paddingLeft: '12px' }}
              />
            </div>

            <div className="mb-4 position-relative">
              <FiLock className="position-absolute" style={{ top: '12px', right: '14px', zIndex: 5, color: 'var(--primary-color)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="كلمة المرور (6 حروف على الأقل)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                dir="ltr"
                style={{ ...inputStyle, textAlign: 'left', paddingLeft: '12px' }}
              />
            </div>

            <button
              type="submit"
              className="btn w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
              disabled={busy || !isFirebaseConfigured}
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold', borderRadius: '10px' }}
            >
              {busy ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : mode === 'login' ? (
                <>
                  <FiLogIn /> دخول
                </>
              ) : (
                <>
                  <FiUserPlus /> إنشاء الحساب
                </>
              )}
            </button>

            {/* فاصل أو */}
            <div className="d-flex align-items-center gap-2 mb-3">
              <hr className="flex-grow-1" style={{ opacity: 0.15 }} />
              <span className="text-muted small">أو</span>
              <hr className="flex-grow-1" style={{ opacity: 0.15 }} />
            </div>

            {/* المتابعة بحساب جوجل */}
            <button
              type="button"
              className="btn w-100 d-flex align-items-center justify-content-center gap-2 mb-3 border"
              onClick={handleGoogleLogin}
              disabled={googleBusy || busy || !isFirebaseConfigured}
              style={{
                backgroundColor: '#ffffff',
                color: '#3c4043',
                fontWeight: 600,
                borderRadius: '10px',
                borderColor: '#dadce0 !important',
              }}
            >
              {googleBusy ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : (
                <>
                  <FcGoogle size={20} /> المتابعة بحساب Google
                </>
              )}
            </button>

            <div className="text-center">
              <button type="button" className="btn btn-link text-decoration-none p-0 small" onClick={switchMode}>
                {mode === 'login'
                  ? 'ليس لديك حساب؟ أنشئ حساباً جديداً'
                  : 'لديك حساب بالفعل؟ سجّل دخولك'}
              </button>
            </div>

            <hr style={{ opacity: 0.1 }} />
            <p className="text-muted small text-center mb-0">
              بدون حساب يمكنك القراءة عادي — الحساب يحفظ مفضلتك وفوائدك على السحابة.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default LoginModal;
