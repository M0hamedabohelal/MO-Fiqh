import { useState, useSyncExternalStore, useCallback, useMemo } from 'react';
import {
  FiHeart,
  FiFacebook,
  FiLinkedin,
  FiPhone,
  FiAward,
  FiChevronLeft,
  FiRefreshCw,
  FiTrash2,
  FiRotateCcw,
  FiShield,
  FiBookOpen,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiExternalLink,
  FiSliders,
  FiLayers,
  FiCheck,
  FiSmartphone,
  FiDownload,
  FiShare,
} from 'react-icons/fi';
import { useApp } from '../Layout/AppContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { isFirebaseConfigured } from '../../firebase/config';
import { safeRemove } from '../../utils/safeStorage';
import { isSyncDisabled, setSyncDisabled, subscribeSyncDisabled } from '../../utils/librarySync';
import GuestAccountCard from '../UI/GuestAccountCard';
import styles from './SettingsView.module.css';

interface FeedbackMessage {
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
}

// شاشة الإعدادات وحول المنصة
const SettingsView = () => {
  const { user, setCurrentView, reloadFromCloud, lessonsCount, appVersion } = useApp();

  // حالات فحص نسخة التطبيق
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [checkedByUser, setCheckedByUser] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  // حالات تحديث محتوى المسائل
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<FeedbackMessage | null>(null);

  // حالات مسح البيانات السحابية
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingCloud, setClearingCloud] = useState(false);
  const [cloudFeedback, setCloudFeedback] = useState<FeedbackMessage | null>(null);

  // حالات تثبيت التطبيق PWA
  const { isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<FeedbackMessage | null>(null);

  // مراقبة حالة إيقاف المزامنة
  const isSyncPausedState = useSyncExternalStore(
    subscribeSyncDisabled,
    () => isSyncDisabled(user?.uid),
    () => false,
  );

  const onOpenAchievements = (): void => setCurrentView('achievements');

  // حساب رسالة التغذية الراجعة لإصدار التطبيق بشكل نقي وتفاعلي
  const versionFeedback: FeedbackMessage | null = useMemo(() => {
    if (!checkedByUser && !appVersion.lastCheckedAt) return null;
    if (appVersion.checkStatus === 'network-error') {
      return {
        type: 'error',
        text: 'تعذر الاتصال بالخادم للتحقق من التحديثات؛ تأكد من اتصال الإنترنت.',
      };
    }
    if (appVersion.checkStatus === 'dev') {
      return {
        type: 'info',
        text: 'بيئة تطوير محلية — التحديثات المنشورة غير مفعلة هنا.',
      };
    }
    if (appVersion.checkStatus === 'update-ready' || appVersion.updateReady) {
      return {
        type: 'warning',
        text: 'توجد نسخة جديدة منشورة للموقع جاهزة للتثبيت الآن!',
      };
    }
    if (appVersion.checkStatus === 'up-to-date') {
      return {
        type: 'success',
        text: 'تطبيقك يعمل بأحدث إصدار متوفر دون أي تحديثات معلقة.',
      };
    }
    return null;
  }, [checkedByUser, appVersion.lastCheckedAt, appVersion.checkStatus, appVersion.updateReady]);

  // الزر الأول: فحص التحديثات
  const handleCheckVersion = async (): Promise<void> => {
    if (checkingVersion || appVersion.checking) return;
    setCheckingVersion(true);
    setCheckedByUser(false);
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 450));
      const [reloaded] = await Promise.all([appVersion.checkAndReload(), minDelay]);
      if (reloaded) return;
      setCheckedByUser(true);
    } catch {
      setCheckedByUser(true);
    } finally {
      setCheckingVersion(false);
    }
  };

  // الزر الثاني: تفريغ الكاش وإعادة التحميل القسري
  const handlePurgeCache = (): void => {
    if (purgingCache || appVersion.reloading) return;
    setPurgingCache(true);
    setCacheNotice('جارٍ تفريغ الذاكرة المؤقتة وسجلات التصفح وإعادة التحميل...');
    // تشغيل التفريغ والتحميل
    setTimeout(() => {
      appVersion.reloadNow();
    }, 150);
  };

  // الزر: تثبيت الموقع كتطبيق (App / PWA)
  const handleInstallApp = async (): Promise<void> => {
    if (isInstalled || installing) return;
    setInstalling(true);
    setInstallFeedback(null);

    try {
      if (isIOS) {
        setShowInstallGuide(true);
        setInstallFeedback({
          type: 'info',
          text: 'للتثبيت على iPhone أو iPad: اضغط على زر المشاركة أسفل المتصفح ثم اختر «إضافة إلى الشاشة الرئيسية».',
        });
        return;
      }

      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setInstallFeedback({
          type: 'success',
          text: 'تم تثبيت تطبيق «يَسِّر» بنجاح على جهازك! ستجده الآن في شاشتك الرئيسية.',
        });
        setShowInstallGuide(false);
      } else if (outcome === 'dismissed') {
        setInstallFeedback({
          type: 'info',
          text: 'تم إلغاء التثبيت. يمكنك إعادة المحاولة في أي وقت بالنقر على الزر.',
        });
      } else {
        // unsupported or prompt not ready yet
        setShowInstallGuide(true);
        setInstallFeedback({
          type: 'info',
          text: 'يمكنك تثبيت التطبيق مباشرة عبر قائمة متصفحك كما هو موضح في الإرشادات بالأسفل.',
        });
      }
    } catch {
      setShowInstallGuide(true);
      setInstallFeedback({
        type: 'info',
        text: 'يمكنك تثبيت التطبيق يدويًا عبر خيارات المتصفح (إضافة إلى الشاشة الرئيسية).',
      });
    } finally {
      setInstalling(false);
    }
  };

  // الزر الثالث: تحديث محتوى المسائل والقاموس من السحابة
  const handleRefreshContent = async (): Promise<void> => {
    if (refreshingContent) return;
    setRefreshingContent(true);
    setRefreshFeedback(null);
    try {
      if (!isFirebaseConfigured) {
        setRefreshFeedback({
          type: 'info',
          text: 'بيانات السحابة غير مفعلة — التطبيق يعمل بالنسخة المحلية بنجاح.',
        });
        return;
      }
      const minDelay = new Promise((resolve) => setTimeout(resolve, 450));
      const [ok] = await Promise.all([reloadFromCloud(true), minDelay]);
      if (ok) {
        setRefreshFeedback({
          type: 'success',
          text: `تم تحديث المسائل والقاموس من السحابة بنجاح (${lessonsCount} مسألة متاحة ومحدثة).`,
        });
      } else {
        setRefreshFeedback({
          type: 'warning',
          text: 'تعذر الاتصال بالسحابة الآن؛ المحتوى المحفوظ على جهازك متاح وتستطيع مواصلة القراءة دون انقطاع.',
        });
      }
    } catch {
      setRefreshFeedback({
        type: 'error',
        text: 'تعذر الاتصال بالسحابة الآن؛ النسخة المحفوظة على جهازك متاحة.',
      });
    } finally {
      setRefreshingContent(false);
    }
  };

  // الزر الرابع: مسح البيانات السحابية
  const handleClearCloudData = async (): Promise<void> => {
    if (!user || clearingCloud) return;
    setClearingCloud(true);
    setCloudFeedback(null);
    try {
      // إيقاف المزامنة أولاً قبل الحذف لمنع أي دفعة تلقائية سريعة
      setSyncDisabled(user.uid, true);
      const [{ getFirestore }, fs] = await Promise.all([
        import('../../firebase/config'),
        import('firebase/firestore'),
      ]);
      const { db } = await getFirestore();
      await Promise.all([
        fs.deleteDoc(fs.doc(db, `users/${user.uid}/data/library`)).catch(() => {}),
        fs.deleteDoc(fs.doc(db, `users/${user.uid}/data/announcementReads`)).catch(() => {}),
      ]);
      safeRemove(`library_stamps_v1_${user.uid}`);
      setShowClearConfirm(false);
      setCloudFeedback({
        type: 'success',
        text: 'تم مسح بياناتك السحابية بنجاح وإيقاف المزامنة لحسابك. بياناتك على هذا الجهاز لا تزال محفوظة.',
      });
    } catch {
      setSyncDisabled(user.uid, false);
      setCloudFeedback({
        type: 'error',
        text: 'تعذر مسح البيانات من السحابة؛ تأكد من اتصال الإنترنت ثم أعد المحاولة.',
      });
    } finally {
      setClearingCloud(false);
    }
  };

  // الزر الخامس: استئناف المزامنة السحابية
  const handleResumeSync = useCallback((): void => {
    if (!user) return;
    setSyncDisabled(user.uid, false);
    setCloudFeedback({
      type: 'success',
      text: 'تمت إعادة تفعيل المزامنة السحابية بنجاح؛ سيتم رفع بياناتك وحفظها تلقائيًا.',
    });
  }, [user]);

  // حالة شارة النسخة الحالية
  const renderVersionBadge = () => {
    if (appVersion.updateReady) {
      return <span className={`${styles.statusChip} ${styles.statusWarning}`}>🔔 تحديث جديد متاح</span>;
    }
    if (appVersion.checkStatus === 'up-to-date') {
      return (
        <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
          <FiCheck size={14} /> أحدث إصدار
        </span>
      );
    }
    if (appVersion.checkStatus === 'dev') {
      return <span className={`${styles.statusChip} ${styles.statusInfo}`}>⚡ تطوير محلي</span>;
    }
    return <span className={`${styles.statusChip} ${styles.statusInfo}`}>إصدار مستقر</span>;
  };

  const cleanBuildHash = appVersion.runningBuild
    ? appVersion.runningBuild.replace('assets/index-', '').replace('.js', '')
    : null;

  return (
    <div className={styles.settingsContainer}>
      {/* بطاقة حساب الزائر */}
      <GuestAccountCard />

      {/* ترويسة الصفحة */}
      <header className={styles.pageHeader}>
        <div className={styles.headerIconBadge}>
          <FiSliders size={26} />
        </div>
        <h2 className={styles.pageTitle}>الإعدادات وحول المنصة</h2>
        <p className={styles.pageSubtitle}>
          التحكم في تحديثات النظام، مزامنة المحتوى الفقهي، والخصوصية السحابية
        </p>
        <div className={styles.headerDivider} />
      </header>

      {/* 1. بطاقة إصدار التطبيق والتحديثات */}
      <section className={styles.settingsCard} aria-labelledby="app-version-heading">
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiLayers />
            </div>
            <h3 id="app-version-heading" className={styles.cardTitle}>
              إصدار التطبيق والتحديثات
            </h3>
          </div>
          {renderVersionBadge()}
        </div>

        <p className={styles.cardDesc}>
          {appVersion.updateReady
            ? 'تم نشر إصدار جديد يتضمن تحسينات ومزايا جديدة. اضغط الزر بالأسفل لتثبيته فورًا.'
            : 'تطبيقك مهيأ للعمل أوفلاين كـ PWA مع تلقي التحديثات السحابية والتحسينات تلقائيًا.'}
        </p>

        <div className={styles.actionRow}>
          <div className={styles.actionBtnGroup}>
            {appVersion.updateReady ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={appVersion.reloadNow}
                disabled={appVersion.reloading}
              >
                {appVersion.reloading ? (
                  <span className={styles.spinner} role="status" aria-hidden="true" />
                ) : (
                  <FiRefreshCw />
                )}
                <span>{appVersion.reloading ? 'جارٍ التحديث...' : 'تحديث التطبيق الآن'}</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleCheckVersion}
                disabled={checkingVersion || appVersion.checking || appVersion.reloading}
              >
                {checkingVersion || appVersion.checking ? (
                  <span className={styles.spinner} role="status" aria-hidden="true" />
                ) : (
                  <FiRefreshCw />
                )}
                <span>
                  {checkingVersion || appVersion.checking
                    ? 'جارٍ الفحص...'
                    : 'التحقق من وجود تحديثات'}
                </span>
              </button>
            )}

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handlePurgeCache}
              disabled={purgingCache || appVersion.reloading}
              title="إفراغ الكاش وService Worker وإعادة تحميل الصفحة"
            >
              {purgingCache || appVersion.reloading ? (
                <span className={styles.spinner} role="status" aria-hidden="true" />
              ) : (
                <FiRotateCcw />
              )}
              <span>
                {purgingCache || appVersion.reloading
                  ? 'جارٍ التحميل...'
                  : 'تفريغ الكاش وإعادة التشغيل'}
              </span>
            </button>
          </div>
        </div>

        {/* رسالة تفريغ الكاش أو التغذية الراجعة لإصدار التطبيق */}
        {cacheNotice && (
          <div role="status" className={`${styles.feedbackAlert} ${styles.feedbackAlertInfo}`}>
            <FiInfo size={18} />
            <span>{cacheNotice}</span>
          </div>
        )}

        {versionFeedback && !cacheNotice && (
          <div
            role="status"
            className={`${styles.feedbackAlert} ${
              versionFeedback.type === 'success'
                ? styles.feedbackAlertSuccess
                : versionFeedback.type === 'warning'
                ? styles.feedbackAlertWarning
                : versionFeedback.type === 'error'
                ? styles.feedbackAlertError
                : styles.feedbackAlertInfo
            }`}
          >
            {versionFeedback.type === 'success' && <FiCheckCircle size={18} />}
            {versionFeedback.type === 'warning' && <FiAlertTriangle size={18} />}
            {versionFeedback.type === 'error' && <FiAlertTriangle size={18} />}
            {versionFeedback.type === 'info' && <FiInfo size={18} />}
            <span>{versionFeedback.text}</span>
          </div>
        )}

        {/* بيانات البناء */}
        <div className={styles.cardMetaFooter}>
          <span>النسخة والبيئة الحالية</span>
          {cleanBuildHash ? (
            <span className={styles.buildTag} title="رمز حزمة النشر">
              build: {cleanBuildHash}
            </span>
          ) : (
            <span className={styles.buildTag}>local-dev</span>
          )}
        </div>
      </section>

      {/* 2. بطاقة تثبيت الموقع كتطبيق (App / PWA) */}
      <section className={styles.settingsCard} aria-labelledby="pwa-install-heading">
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiSmartphone />
            </div>
            <h3 id="pwa-install-heading" className={styles.cardTitle}>
              تثبيت التطبيق على جهازك
            </h3>
          </div>
          {isInstalled ? (
            <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
              <FiCheck size={14} /> التطبيق مُثبّت
            </span>
          ) : (
            <span className={`${styles.statusChip} ${styles.statusInfo}`}>
              متاح كـ تطبيق PWA
            </span>
          )}
        </div>

        <p className={styles.cardDesc}>
          {isInstalled
            ? 'تطبيق «يَسِّر» مثبت حاليًا على جهازك ويعمل كنافذة مستقلة بدون أشرطة المتصفح، مع دعم كامل لتصفح المسائل دون اتصال بالإنترنت.'
            : 'يمكنك تثبيت الموقع كتطبيق خفيف وسريع على هاتفك أو حاسوبك، للوصول الفوري، وتصفح المسائل دون إنترنت، وتجربة قراءة ملء الشاشة خالية من المشتتات.'}
        </p>

        <div className={styles.actionRow}>
          <div className={styles.actionBtnGroup}>
            {!isInstalled ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleInstallApp}
                disabled={installing}
                aria-label="تثبيت الموقع كتطبيق"
              >
                {installing ? (
                  <span className={styles.spinner} role="status" aria-hidden="true" />
                ) : (
                  <FiDownload />
                )}
                <span>{installing ? 'جارٍ التثبيت...' : 'تثبيت الموقع كتطبيق'}</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnSecondary}
                disabled
                style={{ opacity: 0.9, cursor: 'default' }}
              >
                <FiCheck size={16} />
                <span>التطبيق مثبت ويعمل حالياً</span>
              </button>
            )}

            {!isInstalled && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowInstallGuide((prev) => !prev)}
                aria-expanded={showInstallGuide}
                aria-label="إرشادات التثبيت"
              >
                <FiInfo />
                <span>{showInstallGuide ? 'إخفاء الإرشادات' : 'إرشادات التثبيت'}</span>
              </button>
            )}
          </div>
        </div>

        {/* دليل التثبيت الإرشادي */}
        {showInstallGuide && !isInstalled && (
          <div className={styles.installGuideBox} role="region" aria-label="دليل التثبيت لجميع الأجهزة">
            <h4 className={styles.installGuideTitle}>
              <FiSmartphone size={16} /> خطوات التثبيت حسب جهازك:
            </h4>
            <div className={styles.installGuideGrid}>
              <div className={styles.installGuideCard}>
                <div className={styles.installGuideDevice}>📱 هواتف أندرويد (Chrome / Samsung)</div>
                <p className={styles.installGuideStep}>
                  اضغط على زر القائمة <strong>(⋮)</strong> أعلى يسار المتصفح، ثم اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                </p>
              </div>
              <div className={styles.installGuideCard}>
                <div className={styles.installGuideDevice}>🍏 هواتف آيفون وآيباد (iOS Safari)</div>
                <p className={styles.installGuideStep}>
                  اضغط على زر المشاركة <strong>(Share <FiShare size={13} />)</strong> أسفل الشاشة، ثم مرر واختر <strong>«إضافة إلى الشاشة الرئيسية ＋»</strong>.
                </p>
              </div>
              <div className={styles.installGuideCard}>
                <div className={styles.installGuideDevice}>💻 الكمبيوتر واللابتوب (Chrome / Edge)</div>
                <p className={styles.installGuideStep}>
                  اضغط على أيقونة التثبيت <strong>(⊕)</strong> في شريط العنوان بالأعلى، أو من قائمة المتصفح <strong>(⋮)</strong> اختر <strong>«تثبيت تطبيق يَسِّر»</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* رسائل التغذية الراجعة لتثبيت التطبيق */}
        {installFeedback && (
          <div
            role="status"
            className={`${styles.feedbackAlert} ${
              installFeedback.type === 'success'
                ? styles.feedbackAlertSuccess
                : installFeedback.type === 'warning'
                ? styles.feedbackAlertWarning
                : installFeedback.type === 'error'
                ? styles.feedbackAlertError
                : styles.feedbackAlertInfo
            }`}
          >
            {installFeedback.type === 'success' && <FiCheckCircle size={18} />}
            {installFeedback.type === 'warning' && <FiAlertTriangle size={18} />}
            {installFeedback.type === 'error' && <FiAlertTriangle size={18} />}
            {installFeedback.type === 'info' && <FiInfo size={18} />}
            <span>{installFeedback.text}</span>
          </div>
        )}
      </section>

      {/* 3. بطاقة المحتوى الفقهي والمزامنة */}
      <section className={styles.settingsCard} aria-labelledby="content-sync-heading">
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiBookOpen />
            </div>
            <h3 id="content-sync-heading" className={styles.cardTitle}>
              المحتوى الفقهي وقاعدة المسائل
            </h3>
          </div>
          <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
            <FiCheck size={14} /> متوفر دون اتصال
          </span>
        </div>

        <div className={styles.statsPillRow}>
          <div className={styles.statsPill}>
            <FiBookOpen size={15} style={{ color: 'var(--accent-color)' }} />
            <span>{lessonsCount} مسألة فقهية معتمدة</span>
          </div>
          <div className={styles.statsPill}>
            <FiInfo size={15} style={{ color: 'var(--accent-color)' }} />
            <span>قاموس المصطلحات الفقهية</span>
          </div>
        </div>

        <p className={styles.cardDesc}>
          النصوص الفقهية والقاموس محفوظة ومتاحة على جهازك للقراءة في أي وقت. يمكنك في أي لحظة مزامنة
          أحدث التصويبات والإضافات من السحابة.
        </p>

        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleRefreshContent}
            disabled={refreshingContent}
            title="جلب أحدث المسائل والقاموس من السحابة"
          >
            {refreshingContent ? (
              <span className={styles.spinner} role="status" aria-hidden="true" />
            ) : (
              <FiRefreshCw />
            )}
            <span>
              {refreshingContent ? 'جارٍ جلب المحتوى من السحابة...' : 'تحديث المحتوى والقاموس'}
            </span>
          </button>
        </div>

        {/* رسالة التغذية الراجعة لتحديث المحتوى */}
        {refreshFeedback && (
          <div
            role="status"
            className={`${styles.feedbackAlert} ${
              refreshFeedback.type === 'success'
                ? styles.feedbackAlertSuccess
                : refreshFeedback.type === 'warning'
                ? styles.feedbackAlertWarning
                : refreshFeedback.type === 'error'
                ? styles.feedbackAlertError
                : styles.feedbackAlertInfo
            }`}
          >
            {refreshFeedback.type === 'success' && <FiCheckCircle size={18} />}
            {refreshFeedback.type === 'warning' && <FiAlertTriangle size={18} />}
            {refreshFeedback.type === 'error' && <FiAlertTriangle size={18} />}
            {refreshFeedback.type === 'info' && <FiInfo size={18} />}
            <span>{refreshFeedback.text}</span>
          </div>
        )}
      </section>

      {/* 4. بطاقة مسيرتي الفقهية وإنجازاتي */}
      <section className={styles.settingsCard} aria-labelledby="achievements-heading">
        <button
          type="button"
          className={styles.achievementsBtn}
          onClick={onOpenAchievements}
          aria-label="الانتقال إلى صفحة إنجازاتي ومواظبتي"
        >
          <div className={styles.achievementsInner}>
            <div className={styles.achievementsInfo}>
              <div
                className={styles.cardIcon}
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(201, 168, 76, 0.05))',
                  color: 'var(--accent-color)',
                }}
              >
                <FiAward size={22} />
              </div>
              <div>
                <h3 id="achievements-heading" className={styles.cardTitle}>
                  إنجازاتي ومواظبتي
                </h3>
                <span className={styles.cardDesc} style={{ marginBottom: 0, display: 'block' }}>
                  متابعة سلسلة القراءة اليومية، الأوسمة المكتسبة، وشهادات الإتمام
                </span>
              </div>
            </div>
            <div className={styles.achievementsArrow}>
              <FiChevronLeft size={20} />
            </div>
          </div>
        </button>
      </section>

      {/* 5. بطاقة الخصوصية والمزامنة السحابية للمستخدم المسجل */}
      {user && (
        <section className={styles.settingsCard} aria-labelledby="privacy-heading">
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={styles.cardIcon}>
                <FiShield />
              </div>
              <h3 id="privacy-heading" className={styles.cardTitle}>
                الخصوصية والمزامنة السحابية
              </h3>
            </div>
            {isSyncPausedState ? (
              <span className={`${styles.statusChip} ${styles.statusWarning}`}>
                المزامنة متوقفة مؤقتًا
              </span>
            ) : (
              <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
                <FiCheck size={14} /> المزامنة السحابية نشطة
              </span>
            )}
          </div>

          <p className={styles.cardDesc}>
            حسابك المرتبط بالسحابة:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {user.email || user.displayName || 'مستخدم مسجل'}
            </strong>
            <br />
            المفضلة والملاحظات والفوائد يتم حفظها محليًا على هذا الجهاز ومزامنتها سحابيًا تلقائيًا.
          </p>

          <div className={styles.actionRow}>
            {isSyncPausedState ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleResumeSync}
              >
                <FiRefreshCw />
                <span>استئناف المزامنة السحابية</span>
              </button>
            ) : (
              !showClearConfirm && (
                <button
                  type="button"
                  className={styles.btnDangerOutline}
                  onClick={() => setShowClearConfirm(true)}
                >
                  <FiTrash2 />
                  <span>مسح بياناتي السحابية</span>
                </button>
              )
            )}
          </div>

          {/* صندوق تأكيد مسح البيانات السحابية */}
          {showClearConfirm && (
            <div className={styles.confirmBox} role="alert">
              <div className={styles.confirmTitle}>
                هل ترغب فعلاً في حذف بياناتك من خوادم السحابة؟
              </div>
              <div className={styles.confirmDesc}>
                سيتم مسح المفضلة والملاحظات والفوائد وقراءات الإشعارات من السحابة نهائيًا وإيقاف
                المزامنة لحسابك. لن يتم حذف أي بيانات من هذا الجهاز وستظل متاحة محليًا.
              </div>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.btnDangerOutline}
                  onClick={handleClearCloudData}
                  disabled={clearingCloud}
                  style={{ background: '#e74c3c', color: '#fff', border: 'none' }}
                >
                  {clearingCloud ? (
                    <span className={styles.spinner} role="status" aria-hidden="true" />
                  ) : (
                    <FiTrash2 />
                  )}
                  <span>{clearingCloud ? 'جارٍ المسح...' : 'نعم، احذف من السحابة'}</span>
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingCloud}
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </div>
          )}

          {/* رسائل التغذية الراجعة لحالة السحابة */}
          {cloudFeedback && (
            <div
              role="status"
              className={`${styles.feedbackAlert} ${
                cloudFeedback.type === 'success'
                  ? styles.feedbackAlertSuccess
                  : styles.feedbackAlertError
              }`}
            >
              {cloudFeedback.type === 'success' ? (
                <FiCheckCircle size={18} />
              ) : (
                <FiAlertTriangle size={18} />
              )}
              <span>{cloudFeedback.text}</span>
            </div>
          )}
        </section>
      )}

      {/* 6. قسم الدعاء والتواصل مع المطور */}
      <section className={`${styles.settingsCard} ${styles.prayerSection}`}>
        <div className={styles.prayerHeart} aria-hidden="true">
          <FiHeart />
        </div>
        <h3 className={styles.prayerTitle}>طلب دعاء بظهر الغيب</h3>
        <p className={styles.prayerText}>
          «اللهم اجعل هذا العمل خالصًا لوجهك الكريم، وانفع به كل من قرأه وتعلّمه»
          <br />
          نرجو الدعاء للقائمين على الموقع بظهر الغيب وسؤال التوفيق والسداد في الدارين.
        </p>

        <div className={styles.contactDivider} />

        <h4 className={styles.contactTitle}>للتواصل ومقترحات التطوير مع المطور</h4>

        <div className={styles.contactGrid}>
          {/* واتساب */}
          <a
            href="https://wa.me/201093122064"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.contactCard} ${styles.contactCardWhatsApp}`}
            title="محادثة واتساب مباشرة"
          >
            <div className={styles.contactLeft}>
              <div className={`${styles.contactIconCircle} ${styles.whatsappIcon}`}>
                <FiPhone />
              </div>
              <div className={styles.contactMeta}>
                <div className={styles.contactLabel}>واتساب مباشر</div>
                <div className={styles.contactSubtext}>+201093122064</div>
              </div>
            </div>
            <div className={styles.contactActionHint}>
              <FiExternalLink size={18} />
            </div>
          </a>

          {/* فيسبوك */}
          <a
            href="https://www.facebook.com/profile.php?id=100015027550497"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.contactCard} ${styles.contactCardFacebook}`}
            title="الملف الشخصي على فيسبوك"
          >
            <div className={styles.contactLeft}>
              <div className={`${styles.contactIconCircle} ${styles.facebookIcon}`}>
                <FiFacebook />
              </div>
              <div className={styles.contactMeta}>
                <div className={styles.contactLabel}>حساب فيسبوك</div>
                <div className={styles.contactSubtext}>Mohamed Abo Helal</div>
              </div>
            </div>
            <div className={styles.contactActionHint}>
              <FiExternalLink size={18} />
            </div>
          </a>

          {/* لينكد إن */}
          <a
            href="https://www.linkedin.com/in/mohamed-abohelal"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.contactCard} ${styles.contactCardLinkedIn}`}
            title="الملف المهني على لينكد إن"
          >
            <div className={styles.contactLeft}>
              <div className={`${styles.contactIconCircle} ${styles.linkedinIcon}`}>
                <FiLinkedin />
              </div>
              <div className={styles.contactMeta}>
                <div className={styles.contactLabel}>حساب لينكد إن</div>
                <div className={styles.contactSubtext}>Mohamed Abohelal</div>
              </div>
            </div>
            <div className={styles.contactActionHint}>
              <FiExternalLink size={18} />
            </div>
          </a>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
