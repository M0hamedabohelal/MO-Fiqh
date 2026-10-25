import { useState } from 'react';
import { FiHeart, FiFacebook, FiLinkedin, FiPhone, FiAward, FiChevronLeft, FiRefreshCw } from 'react-icons/fi';
import { useApp } from '../Layout/AppContext';
import { isFirebaseConfigured } from '../../firebase/config';
import GuestAccountCard from '../UI/GuestAccountCard';

// شاشة الإعدادات وحول التطبيق
const SettingsView = () => {
  const { setCurrentView, reloadFromCloud, lessonsCount, appVersion } = useApp();
  const [versionMessage, setVersionMessage] = useState('');
  const onOpenAchievements = (): void => setCurrentView('achievements');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  // تحديث المحتوى من السحابة (مسائل + قاموس) — ليس مزامنة بيانات حساب، فقط جلب أحدث نسخة.
  const handleRefreshContent = async (): Promise<void> => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage('');
    try {
      if (!isFirebaseConfigured) {
        setRefreshMessage('بيانات السحابة غير مفعلة — التطبيق يعمل بالنسخة المحلية بنجاح.');
        return;
      }
      const ok = await reloadFromCloud(true);
      setRefreshMessage(ok ? 'تم تحديث المسائل والقاموس من السحابة بنجاح.' : 'تعذر الاتصال بالسحابة الآن؛ النسخة المحفوظة على جهازك متاحة.');
    } catch {
      setRefreshMessage('تعذر الاتصال بالسحابة الآن؛ النسخة المحفوظة على جهازك متاحة.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
  <div className="mt-4 mb-5 text-center">
    <GuestAccountCard />
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
      حول التطبيق والإعدادات
    </h3>

    {/* تحديث التطبيق — التحقق من وجود نسخة جديدة تم نشرها */}
    <div className="custom-card p-3 p-md-4 mx-auto mb-4" style={{ maxWidth: '600px' }}>
      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div className="text-start text-md-end flex-grow-1">
          <div className="fw-bold" style={{ color: 'var(--text-main)' }}>نسخة التطبيق</div>
          <span className="small text-muted">
            {appVersion.updateReady ? 'توجد نسخة جديدة منشورة للموقع!' : 'أنت تستخدم أحدث نسخة من الموقع.'}
          </span>
        </div>
        {appVersion.updateReady ? (
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-2"
            onClick={appVersion.reloadNow}
            disabled={appVersion.reloading}
            style={{ backgroundColor: 'var(--accent-color)', color: '#1d1d1d', fontWeight: 'bold', border: 'none' }}
          >
            {appVersion.reloading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <FiRefreshCw />}
            {appVersion.reloading ? 'جارٍ التحديث...' : 'تحديث التطبيق الآن'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={async () => {
              setVersionMessage('');
              const reloaded = await appVersion.checkAndReload();
              if (reloaded) return;
              if (appVersion.checkStatus === 'network-error') {
                setVersionMessage('تعذر التحقق من التحديثات؛ تأكد من اتصال الإنترنت.');
              } else if (appVersion.checkStatus === 'dev') {
                setVersionMessage('بيئة تطوير محلية — التحديثات المنشورة غير مفعلة هنا.');
              } else {
                setVersionMessage('تطبيقك محدّث بالكامل إلى آخر إصدار.');
              }
            }}
            disabled={appVersion.checking || appVersion.reloading}
          >
            {appVersion.checking ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <FiRefreshCw />}
            {appVersion.checking ? 'جارٍ الفحص...' : 'التحقق من التحديثات'}
          </button>
        )}
      </div>
      {versionMessage && <small className="d-block mt-2 text-muted" role="status">{versionMessage}</small>}
      <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-link text-decoration-none p-0 small"
          style={{ fontSize: '0.82rem', color: 'var(--accent-color)' }}
          onClick={appVersion.reloadNow}
          disabled={appVersion.reloading}
        >
          {appVersion.reloading ? 'جارٍ إعادة التحميل...' : 'إعادة تحميل قسرية وتفريغ الكاش'}
        </button>
        {appVersion.runningBuild && (
          <small className="text-muted" dir="ltr" style={{ opacity: 0.7, fontSize: '0.75rem' }}>
            build: {appVersion.runningBuild.replace('assets/index-', '').replace('.js', '')}
          </small>
        )}
      </div>
    </div>

    <div className="custom-card p-3 p-md-4 mx-auto mb-4" style={{ maxWidth: '600px' }}>
      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <span className="small text-muted">{lessonsCount} مسألة متاحة على هذا الجهاز</span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={handleRefreshContent}
          disabled={refreshing}
          title="جلب أحدث المسائل والقاموس من السحابة"
        >
          {refreshing ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <FiRefreshCw />}
          {refreshing ? 'جارٍ التحديث...' : 'تحديث المحتوى'}
        </button>
      </div>
      {refreshMessage && <small className="d-block mt-2 text-muted" role="status">{refreshMessage}</small>}
    </div>

    {/* بطاقة الدخول للإنجازات */}
    <div className="custom-card p-4 mx-auto mb-4" style={{ maxWidth: '600px' }}>
      <button
        className="btn w-100 d-flex justify-content-between align-items-center list-btn border-0 p-3"
        onClick={onOpenAchievements}
      >
        <span className="d-flex align-items-center gap-2 fw-bold" style={{ color: 'var(--text-main)' }}>
          <FiAward size={22} style={{ color: 'var(--accent-color)' }} /> إنجازاتي ومواظبتي
        </span>
        <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
      </button>
    </div>

    <div className="custom-card p-5 mx-auto text-center" style={{ maxWidth: '600px' }}>

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
};

export default SettingsView;
