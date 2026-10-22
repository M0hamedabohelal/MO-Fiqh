import { useState, useEffect, useRef } from 'react';
import { FiHeart, FiFacebook, FiLinkedin, FiPhone, FiDownload, FiCheckCircle, FiAward, FiChevronLeft, FiRefreshCw, FiCloud, FiWifiOff, FiFlag } from 'react-icons/fi';
import { useApp } from '../Layout/AppContext';
import GuestAccountCard from '../UI/GuestAccountCard';

// شاشة الإعدادات وحول التطبيق
const SettingsView = () => {
  const {
    canInstall,
    promptInstall: onInstall,
    isInstalled,
    setCurrentView,
    needRefresh,
    applyUpdate: onApplyUpdate,
    checkForUpdates: onCheckForUpdates,
    librarySyncState,
    retryLibrarySync,
    retryStopMarkSync,
    cloudLessonsLoaded,
    contentSyncDone,
    isOffline,
    lessonsCount,
    stopMarksSyncState,
    stopMarksLastSyncedAt,
    stopMarksReady,
    lastSyncedAt,
    user,
    reloadFromCloud,
  } = useApp();
  const onOpenAchievements = (): void => setCurrentView('achievements');
  const [checking, setChecking] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [contentRefreshMessage, setContentRefreshMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  // لحظة ظهور تحديث حقيقي ننهي الفحص فورًا — زر التحديث يحل محل زر الفحص تلقائيًا
  // مزامنة مقصودة مع حالة خارجية (الـ Service Worker) لا بديل تفاعلي لها
  useEffect(() => {
    if (needRefresh && checking) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
      setCheckedOnce(true);
    }
  }, [needRefresh, checking]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleCheck = async (): Promise<void> => {
    if (checking) return;
    setChecking(true);
    setCheckedOnce(false);
    try {
      await onCheckForUpdates?.();
    } finally {
      // مهلة قصوى لاكتمال تنزيل النسخة الجديدة — رسالة "أحدث نسخة" لا تظهر إلا بعدها فعلًا
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setChecking(false);
        setCheckedOnce(true);
      }, 10000);
    }
  };

  const handleRefreshContent = async (): Promise<void> => {
    if (refreshingContent) return;
    setRefreshingContent(true);
    setContentRefreshMessage('');
    try {
      const ok = await reloadFromCloud();
      setContentRefreshMessage(
        ok
          ? 'تم تحديث المسائل من السحابة بنجاح.'
          : (isOffline
              ? 'الجهاز يبدو غير متصل بالإنترنت الآن؛ أعد المحاولة عند تأكّد الاتصال.'
              : 'تعذر تحديث المسائل الآن؛ سيظل المحتوى المحفوظ متاحًا وأعد المحاولة بعد قليل.'),
      );
    } catch {
      setContentRefreshMessage('تعذر تحديث المحتوى الآن؛ سيظل المحتوى المحفوظ متاحًا.');
    } finally {
      setRefreshingContent(false);
    }
  };

  // زر واحد موحّد: يحدّث المحتوى من السحابة ويعيد محاولة مزامنة المكتبة وعلامات الوقوف معًا.
  // يمنع تكرار عدة أزرار لنفس الغرض ويجعل الإجراء واضحًا للمستخدم.
  const handleSyncAll = async (): Promise<void> => {
    if (refreshingContent) return;
    retryLibrarySync();
    retryStopMarkSync();
    await handleRefreshContent();
  };

  const librarySyncLabel = isOffline
    ? librarySyncState === 'pending'
      ? 'التغييرات محفوظة على الجهاز وتنتظر الاتصال'
      : 'غير متصل — بيانات هذا الجهاز متاحة'
    : librarySyncState === 'loading'
      ? 'جارٍ تحميل بيانات الحساب'
      : librarySyncState === 'syncing'
        ? 'جارٍ مزامنة بيانات الحساب'
        : librarySyncState === 'pending'
          ? 'تغييرات محفوظة محليًا وتنتظر المزامنة'
          : librarySyncState === 'synced'
            ? 'متزامنة مع الحساب'
            : librarySyncState === 'local'
              ? 'محفوظة على هذا الجهاز فقط'
              : librarySyncState === 'offline'
                ? 'مزامنة الحساب غير مؤكدة — النسخة المحفوظة على الجهاز متاحة'
                : 'تعذرت المزامنة — التغييرات محفوظة محليًا';
  const contentSourceLabel = cloudLessonsLoaded
    ? 'المسائل محمّلة من السحابة'
    : contentSyncDone
      ? 'المسائل محمّلة من النسخة المحلية'
      : 'جارٍ تحميل المسائل';
  // لم تُحمَّل المسائل من السحابة بعد (فشل أو ما زال يحاول) — نُبرز زر التحديث اليدوي دائمًا.
  const contentFailed = !cloudLessonsLoaded;
  const stopMarkLabel = !stopMarksReady
    ? 'جارٍ استعادة العلامات'
    : stopMarksSyncState === 'pending'
      ? 'محفوظة محليًا وتنتظر المزامنة'
      : stopMarksSyncState === 'synced'
        ? 'علامات الوقوف متزامنة'
        : stopMarksSyncState === 'error'
          ? 'تعذرت المزامنة — ستُعاد المحاولة عند الاتصال'
          : user
            ? 'علامات الحساب محفوظة محليًا'
            : 'محفوظة على هذا الجهاز للضيف';

  return (
  <div className="mt-4 mb-5 text-center">
    <GuestAccountCard />
    <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
      حول التطبيق والإعدادات
    </h3>

    <div className="custom-card p-3 p-md-4 mx-auto mb-4 text-end" style={{ maxWidth: '600px' }} aria-labelledby="sync-center-title">
      <h5 id="sync-center-title" className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--primary-color)' }}>
        {isOffline ? <FiWifiOff /> : <FiCloud />} حالة البيانات والمزامنة
      </h5>
      <div className="d-flex flex-column gap-2 small">
        <div className="d-flex justify-content-between gap-3"><span>المحتوى ({lessonsCount} مسألة)</span><strong>{contentSourceLabel}</strong></div>
        <div className="d-flex justify-content-between gap-3"><span>مكتبة الحساب</span><strong>{user ? librarySyncLabel : 'الضيف: محفوظة على هذا الجهاز'}</strong></div>
        {user && <div className="d-flex justify-content-between gap-3"><span>آخر مزامنة للمكتبة</span><strong>{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('ar-EG') : 'لم تكتمل بعد'}</strong></div>}
        <div className="d-flex justify-content-between gap-3"><span><FiFlag className="ms-1" />علامة الوقوف</span><strong>{stopMarkLabel}</strong></div>
        {user && <div className="d-flex justify-content-between gap-3"><span>آخر مزامنة للعلامة</span><strong>{stopMarksLastSyncedAt ? new Date(stopMarksLastSyncedAt).toLocaleString('ar-EG') : 'لم تكتمل بعد'}</strong></div>}
      </div>
      <p className="text-muted small mt-3 mb-2">
        عند تسجيل الدخول، تنتقل المفضلة والملاحظات والمسائل المقروءة وعلامات الوقوف بين أجهزتك. التغييرات دون إنترنت تُحفظ في هذا الجهاز وتُرسل تلقائيًا عند عودة الاتصال.
      </p>
      {/* زر واحد موحّد للمزامنة والتحديث: يتحوّل لتنبيه تحذيري بارز عند تعذّر تحميل المسائل
          من السحابة، ويبقى زرًا هادئًا عاديًا خلاف ذلك — لا تكرار لعمل واحد. */}
      {contentFailed ? (
        <div className="alert alert-warning d-flex flex-column gap-2 mb-2 text-start" role="alert">
          <span className="d-flex align-items-center gap-2 fw-bold">
            <FiWifiOff /> تعذر تحديث المسائل من السحابة
          </span>
          <small className="text-muted">النسخة المحفوظة على هذا الجهاز متاحة الآن. اضغط الزر لإعادة المحاولة.</small>
          <button
            type="button"
            className="btn btn-warning btn-sm d-flex align-items-center justify-content-center gap-2 fw-bold"
            onClick={handleSyncAll}
            disabled={refreshingContent}
          >
            {refreshingContent ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <FiRefreshCw />}
            {refreshingContent ? 'جارٍ تحديث المسائل...' : 'تحديث المسائل الآن'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={handleSyncAll}
          disabled={refreshingContent}
          title={isOffline ? 'يُعاد المحاولة تلقائيًا عند رجوع الاتصال' : 'تحديث المحتوى ومزامنة بيانات الحساب'}
        >
          {refreshingContent ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <FiRefreshCw />}
          {refreshingContent ? 'جارٍ التحديث والمزامنة...' : 'تحديث المزامنة والمحتوى'}
        </button>
      )}
      {contentRefreshMessage && <small className="d-block mt-2 text-muted" role="status">{contentRefreshMessage}</small>}
    </div>

    {/* قسم تحديث التطبيق */}
    <div className="custom-card p-4 mx-auto mb-4" style={{ maxWidth: '600px' }}>
      <h5 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2" style={{ color: 'var(--text-main)' }}>
        <FiRefreshCw size={20} style={{ color: 'var(--accent-color)' }} /> تحديث التطبيق
      </h5>
      {needRefresh ? (
        <button
          className="btn w-100 d-flex align-items-center justify-content-center gap-2 border-0"
          onClick={onApplyUpdate}
          style={{ background: 'linear-gradient(135deg, #4eb9a8, #2a9d8f)', color: '#fff', fontWeight: 'bold', borderRadius: '10px', padding: '10px' }}
        >
          <FiRefreshCw size={18} /> تحديث الموقع الآن
        </button>
      ) : (
        <>
          <button
            className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleCheck}
            disabled={checking}
            style={{ borderRadius: '10px', padding: '10px' }}
          >
            <FiRefreshCw size={18} />
            {checking ? 'جارٍ التحقق...' : 'التحقق من وجود تحديث'}
          </button>
          {checkedOnce && !needRefresh && (
            <small className="text-muted d-block mt-2">أنت على أحدث نسخة</small>
          )}
        </>
      )}
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
            style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-on-primary)', borderRadius: '10px', fontWeight: 'bold' }}
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
};

export default SettingsView;
