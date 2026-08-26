import { FiHeart, FiFacebook, FiLinkedin, FiPhone, FiDownload, FiCheckCircle } from 'react-icons/fi';

// شاشة الإعدادات وحول التطبيق
const SettingsView = ({ canInstall, onInstall, isInstalled }) => (
  <div className="mt-4 mb-5 text-center">
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
      حول التطبيق والإعدادات
    </h3>

    <div className="custom-card p-5 mx-auto text-center" style={{ maxWidth: '600px' }}>

      {/* قسم تثبيت التطبيق */}
      {canInstall && (
        <>
          <FiDownload size={50} className="mx-auto mb-3" style={{ color: 'var(--primary-color)' }} />
          <h4 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>ثبّت التطبيق على جهازك</h4>
          <p className="text-muted mb-4" style={{ lineHeight: '1.8' }}>
            ثبّت "الباحث الفقهي" كتطبيق مستقل — فتح أسرع، وقراءة بدون إنترنت للمحتوى المحمّل.
          </p>
          <button
            className="btn btn-lg d-flex align-items-center justify-content-center gap-2 shadow-sm border-0 w-75 mx-auto mb-4"
            style={{ backgroundColor: 'var(--primary-color)', color: 'var(--accent-color)', borderRadius: '10px', fontWeight: 'bold' }}
            onClick={onInstall}
          >
            <FiDownload size={22} /> تثبيت الآن
          </button>
          <hr className="my-4 w-75 mx-auto" style={{ opacity: 0.1 }} />
        </>
      )}
      {isInstalled && (
        <>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-4 small" style={{ color: '#27ae60' }}>
            <FiCheckCircle size={18} /> التطبيق مثبت على جهازك
          </div>
          <hr className="my-4 w-75 mx-auto" style={{ opacity: 0.1 }} />
        </>
      )}

      {/* قسم الدعاء */}
      <FiHeart size={50} className="mx-auto mb-3" style={{ color: '#e74c3c' }} />
      <h4 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>طلب دعاء</h4>
      <p className="fs-5 text-muted mb-4" style={{ lineHeight: '1.8' }}>
        نرجو الدعاء لمصمم الموقع بظهر الغيب وسؤال التوفيق والسداد في الدارين.
      </p>

      <hr className="my-4 w-75 mx-auto" style={{ opacity: 0.1 }} />

      {/* قسم التواصل */}
      <h5 className="fw-bold mb-4" style={{ color: 'var(--primary-color)' }}>للتواصل مع المطور:</h5>

      <div className="d-flex flex-column gap-3 px-md-4">
        <a
          href="https://wa.me/201093122064"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-lg d-flex align-items-center justify-content-center gap-3 shadow-sm border-0"
          style={{ backgroundColor: '#25D366', color: 'white', borderRadius: '10px' }}
        >
          <FiPhone size={24} /> +201093122064
        </a>

        <a
          href="https://www.facebook.com/profile.php?id=100015027550497"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-lg d-flex align-items-center justify-content-center gap-3 shadow-sm border-0"
          style={{ backgroundColor: '#1877F2', color: 'white', borderRadius: '10px' }}
        >
          <FiFacebook size={24} /> حساب فيسبوك
        </a>

        <a
          href="https://www.linkedin.com/in/mohamed-abohelal"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-lg d-flex align-items-center justify-content-center gap-3 shadow-sm border-0"
          style={{ backgroundColor: '#0A66C2', color: 'white', borderRadius: '10px' }}
        >
          <FiLinkedin size={24} /> حساب لينكد إن
        </a>
      </div>

    </div>
  </div>
);

export default SettingsView;
