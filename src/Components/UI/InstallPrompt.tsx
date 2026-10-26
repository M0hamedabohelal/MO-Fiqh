import { useState, useEffect } from 'react';
import { FiDownload, FiX, FiShare } from 'react-icons/fi';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import logo from '../../assets/logo-circle-64.webp';
import styles from './InstallPrompt.module.css';

const SHOW_DELAY_MS = 2500;

const checkReducedMotion = (): boolean => {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, isDismissed, promptInstall, dismissPrompt } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [reducedMotion] = useState(() => checkReducedMotion());

  const shouldShow = isInstallable && !isDismissed && !isInstalled;

  useEffect(() => {
    if (!shouldShow) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  if (!visible || isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    dismissPrompt();
  };

  return (
    <aside
      className={styles.installContainer}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
    >
      <div className={styles.headerRow}>
        <img src={logo} alt="شعار يَسِّر" className={styles.appIcon} width={46} height={46} />
        <div className={styles.titleCol}>
          <span id="pwa-install-title" className={styles.appTitle}>
            تثبيت تطبيق «يَسِّر»
          </span>
          <span id="pwa-install-desc" className={styles.appSubtitle}>
            وصول سريع وقراءة سلسة بدون إنترنت
          </span>
        </div>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={handleDismiss}
          aria-label="إغلاق التنبيه"
        >
          <FiX size={18} />
        </button>
      </div>

      {isIOS ? (
        <div className={styles.iosGuide}>
          <div>للتثبيت على جهاز iPhone أو iPad:</div>
          <div className={styles.iosStep}>
            <FiShare size={15} /> اضغط على زر المشاركة أسفل المتصفح، ثم اختر:
          </div>
          <div style={{ fontWeight: 700, marginTop: '2px', color: '#e2c06a' }}>
            «إضافة إلى الشاشة الرئيسية ＋»
          </div>
        </div>
      ) : null}

      <div className={styles.actionsRow}>
        {!isIOS ? (
          <button
            type="button"
            className={styles.installBtn}
            onClick={handleInstallClick}
          >
            <FiDownload size={16} />
            تثبيت التطبيق
          </button>
        ) : (
          <button
            type="button"
            className={styles.installBtn}
            onClick={handleDismiss}
          >
            فهمت ذلك
          </button>
        )}
        <button
          type="button"
          className={styles.laterBtn}
          onClick={handleDismiss}
        >
          لاحقاً
        </button>
      </div>
    </aside>
  );
};
