import { useState, useMemo } from 'react';
import {
  FiLayers,
  FiRefreshCw,
  FiRotateCcw,
  FiSmartphone,
  FiCheck,
  FiDownload,
  FiInfo,
  FiShare,
  FiTablet,
  FiMonitor,
} from 'react-icons/fi';
import styles from '../SettingsView.module.css';
import { SettingsSection, FeedbackAlert } from './SettingsSection';
import type { FeedbackMessage } from './types';
import type { AppVersionState } from '../../../hooks/useAppVersion';
import { usePWAInstall } from '../../../hooks/usePWAInstall';

interface AppVersionSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  appVersion: AppVersionState;
}

export const AppVersionSection = ({ isOpen, onToggle, appVersion }: AppVersionSectionProps) => {
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [checkedByUser, setCheckedByUser] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const { isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<FeedbackMessage | null>(null);

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

  const handlePurgeCache = (): void => {
    if (purgingCache || appVersion.reloading) return;
    setPurgingCache(true);
    setCacheNotice('جارٍ تفريغ الذاكرة المؤقتة وسجلات التصفح وإعادة التحميل...');
    setTimeout(() => {
      appVersion.reloadNow();
    }, 150);
    setTimeout(() => {
      setPurgingCache(false);
    }, 4000);
  };

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
    <SettingsSection
      id="app"
      icon={<FiLayers />}
      title="التطبيق والتحديثات"
      subtitle="إصدار النظام وتفريغ الذاكرة وخيارات التثبيت"
      badge={
        appVersion.updateReady ? (
          <span className={`${styles.statusChip} ${styles.statusWarning}`}>
            🔔 تحديث متاح
          </span>
        ) : isInstalled ? (
          <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
            <FiCheck size={14} /> مُثبّت
          </span>
        ) : (
          renderVersionBadge()
        )
      }
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* البطاقة الفرعية 1: إصدار التطبيق والتحديثات */}
      <div className={styles.subCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiLayers />
            </div>
            <h4 id="app-version-heading" className={styles.cardTitle}>
              إصدار التطبيق والتحديثات
            </h4>
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

        {cacheNotice && (
          <div role="status" className={`${styles.feedbackAlert} ${styles.feedbackAlertInfo}`}>
            <FiInfo size={18} />
            <span>{cacheNotice}</span>
          </div>
        )}

        {!cacheNotice && <FeedbackAlert feedback={versionFeedback} />}

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
      </div>

      {/* البطاقة الفرعية 2: تثبيت الموقع كتطبيق */}
      <div className={styles.subCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiSmartphone />
            </div>
            <h4 id="pwa-install-heading" className={styles.cardTitle}>
              تثبيت التطبيق على جهازك
            </h4>
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

        {showInstallGuide && !isInstalled && (
          <div
            className={styles.installGuideBox}
            role="region"
            aria-label="دليل التثبيت لجميع الأجهزة"
          >
            <h5 className={styles.installGuideTitle}>
              <FiSmartphone size={16} /> خطوات التثبيت حسب جهازك:
            </h5>
            <div className={styles.installGuideGrid}>
              <div className={styles.installGuideCard}>
                <div className={styles.installGuideDevice}>
                  <FiSmartphone size={16} /> هواتف أندرويد (Chrome / Samsung)
                </div>
                <p className={styles.installGuideStep}>
                  اضغط على زر القائمة <strong>(⋮)</strong> أعلى يسار المتصفح، ثم اختر{' '}
                  <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                </p>
              </div>
              <div className={styles.installGuideCard}>
                <div className={styles.installGuideDevice}>
                  <FiTablet size={16} /> هواتف آيفون وآيباد (iOS Safari)
                </div>
                <p className={styles.installGuideStep}>
                  اضغط على زر المشاركة <strong>(Share <FiShare size={13} />)</strong> أسفل الشاشة،
                  ثم مرر واختر <strong>«إضافة إلى الشاشة الرئيسية ＋»</strong>.
                </p>
              </div>
              <div className={styles.installGuideCard}>
                <div className={styles.installGuideDevice}>
                  <FiMonitor size={16} /> الكمبيوتر واللابتوب (Chrome / Edge)
                </div>
                <p className={styles.installGuideStep}>
                  اضغط على أيقونة التثبيت <strong>(⊕)</strong> في شريط العنوان بالأعلى، أو من قائمة
                  المتصفح <strong>(⋮)</strong> اختر <strong>«تثبيت تطبيق يَسِّر»</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <FeedbackAlert feedback={installFeedback} />
      </div>
    </SettingsSection>
  );
};
