// نافذة تسجيل الدخول / إنشاء حساب
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiLogIn, FiUserPlus, FiMail, FiLock, FiUser, FiLogOut, FiArrowLeft } from 'react-icons/fi';
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
      // في حالة Popup: ننتظر onAuthStateChanged لإغلاق النافذة
      // في حالة Redirect: الصفحة ستُعاد تحميلها تلقائياً
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

  // ✅ إصلاح مشكلة Dark mode: تحديد الألوان بشكل صريح بدلاً من CSS variables غير المتوافقة مع Bootstrap
  const inputStyle = {
    backgroundColor: 'var(--input-bg, var(--badge-bg))',
    color: 'var(--text-main)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '10px',
    paddingRight: '44px',
    paddingTop: '11px',
    paddingBottom: '11px',
    outline: 'none',
    width: '100%',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-ui)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  return (
    <div
      className="modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1100, padding: '20px' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-100"
        style={{
          maxWidth: '440px',
          zIndex: 1101,
          backgroundColor: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #0a2c2d 100%)',
            padding: '20px 24px 18px',
            position: 'relative',
          }}
        >
          <button
            className="btn p-1 d-flex align-items-center justify-content-center"
            onClick={onClose}
            title="إغلاق"
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              color: 'rgba(255,255,255,0.7)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              border: 'none',
            }}
          >
            <FiX size={18} />
          </button>
          <h5 className="mb-0 fw-bold text-center" style={{ color: '#fbdc99', fontSize: '1.1rem' }}>
            {user ? '👤 حسابك' : mode === 'login' ? '🔐 تسجيل الدخول' : '✨ إنشاء حساب جديد'}
          </h5>
          <p className="mb-0 text-center mt-1" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
            {user ? 'مفضلتك وفوائدك متزامنة' : 'الباحث الفقهي — منصة الفقه الإسلامي'}
          </p>
        </div>

        <div className="p-4">
          {!isFirebaseConfigured && (
            <div className="alert alert-warning small mb-3 py-2">
              خدمة الحسابات غير مفعّلة حالياً — تأكد من إعداد ملف .env.local بمفاتيح Firebase.
            </div>
          )}

          {/* المستخدم مسجل دخول بالفعل */}
          {user ? (
            <div>
              <div className="text-center mb-4">
                <div
                  className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: '72px',
                    height: '72px',
                    background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))',
                    color: '#fff',
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  }}
                >
                  {(user.displayName || user.email || '؟').charAt(0).toUpperCase()}
                </div>
                <h6 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>
                  {user.displayName || 'مستخدم'}
                </h6>
                <small className="text-muted">{user.email}</small>
              </div>
              <p className="text-muted small text-center mb-4">
                مفضلتك وفوائدك وملاحظاتك محفوظة ومتزامنة عبر أجهزتك تلقائياً.
              </p>
              <button
                className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  border: 'none',
                  padding: '11px',
                }}
                onClick={handleLogout}
              >
                <FiLogOut size={16} /> تسجيل الخروج
              </button>
            </div>
          ) : (
            /* نموذج الدخول / التسجيل */
            <form onSubmit={handleSubmit}>
              {authError && (
                <div className="alert alert-danger py-2 small mb-3" role="alert" style={{ borderRadius: '10px' }}>
                  {authError}
                </div>
              )}

              {mode === 'register' && (
                <div className="mb-3 position-relative">
                  <FiUser
                    className="position-absolute"
                    style={{ top: '50%', right: '14px', transform: 'translateY(-50%)', zIndex: 5, color: 'var(--primary-color)' }}
                    size={16}
                  />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="اسمك (اختياري)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* ✅ حقل البريد الإلكتروني بإصلاح Dark mode */}
              <div className="mb-3 position-relative">
                <FiMail
                  className="position-absolute"
                  style={{ top: '50%', right: '14px', transform: 'translateY(-50%)', zIndex: 5, color: 'var(--primary-color)' }}
                  size={16}
                />
                <input
                  type="email"
                  className="login-input"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  style={{ ...inputStyle, textAlign: 'left', paddingLeft: '14px', paddingRight: '44px' }}
                />
              </div>

              {/* ✅ حقل كلمة المرور بإصلاح Dark mode */}
              <div className="mb-4 position-relative">
                <FiLock
                  className="position-absolute"
                  style={{ top: '50%', right: '14px', transform: 'translateY(-50%)', zIndex: 5, color: 'var(--primary-color)' }}
                  size={16}
                />
                <input
                  type="password"
                  className="login-input"
                  placeholder="كلمة المرور (6 حروف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  dir="ltr"
                  style={{ ...inputStyle, textAlign: 'left', paddingLeft: '14px', paddingRight: '44px' }}
                />
              </div>

              <button
                type="submit"
                className="btn w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
                disabled={busy || !isFirebaseConfigured}
                style={{
                  background: 'linear-gradient(135deg, var(--primary-color), #0a5c5e)',
                  color: 'var(--text-on-primary)',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  border: 'none',
                  padding: '11px',
                  fontSize: '0.95rem',
                }}
              >
                {busy ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : mode === 'login' ? (
                  <>
                    <FiLogIn size={16} /> دخول
                  </>
                ) : (
                  <>
                    <FiUserPlus size={16} /> إنشاء الحساب
                  </>
                )}
              </button>

              {/* فاصل أو */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <hr className="flex-grow-1 m-0" style={{ opacity: 0.15 }} />
                <span className="text-muted small px-1">أو</span>
                <hr className="flex-grow-1 m-0" style={{ opacity: 0.15 }} />
              </div>

              {/* المتابعة بحساب جوجل */}
              <button
                type="button"
                className="btn w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
                onClick={handleGoogleLogin}
                disabled={googleBusy || busy || !isFirebaseConfigured}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#3c4043',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: '1.5px solid #dadce0',
                  padding: '10px',
                  fontSize: '0.9rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}
              >
                {googleBusy ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : (
                  <>
                    <FcGoogle size={20} />
                    <span>المتابعة بحساب Google</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0 small d-inline-flex align-items-center gap-1"
                  style={{ color: 'var(--primary-color)', fontSize: '0.85rem' }}
                  onClick={switchMode}
                >
                  <FiArrowLeft size={13} />
                  {mode === 'login'
                    ? 'ليس لديك حساب؟ أنشئ حساباً جديداً'
                    : 'لديك حساب بالفعل؟ سجّل دخولك'}
                </button>
              </div>

            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginModal;
