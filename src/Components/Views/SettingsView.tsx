import { useState, useSyncExternalStore } from 'react';
import { FiSliders, FiShield } from 'react-icons/fi';
import { useApp } from '../Layout/AppContext';
import { isSyncDisabled, subscribeSyncDisabled } from '../../utils/librarySync';
import GuestAccountCard from '../UI/GuestAccountCard';
import styles from './SettingsView.module.css';
import { AppVersionSection } from './Settings/AppVersionSection';
import { ContentSyncSection } from './Settings/ContentSyncSection';
import { AccountPrivacySection } from './Settings/AccountPrivacySection';
import { DeveloperContactSection } from './Settings/DeveloperContactSection';

// شاشة الإعدادات وحول المنصة (معمارية مجزأة لمكونات قابلة للصيانة السلسة)
const SettingsView = () => {
  const { user, setCurrentView, reloadFromCloud, lessonsCount, appVersion, isAdminUser } = useApp();

  // حالات فتح/طي مجموعات الأكورديون الأربعة (جميع المجموعات مغلقة افتراضيًا لتصفح هادئ وسريع)
  const [openSections, setOpenSections] = useState({
    app: false,
    content: false,
    account: false,
    contact: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // مراقبة حالة إيقاف المزامنة
  const isSyncPausedState = useSyncExternalStore(
    subscribeSyncDisabled,
    () => isSyncDisabled(user?.uid),
    () => false,
  );

  const onOpenAchievements = (): void => setCurrentView('achievements');

  return (
    <div className={styles.settingsContainer}>
      {/* بطاقة حساب الزائر */}
      <GuestAccountCard />

      {/* بطاقة الوصول السريع للمشرف — تظهر للمشرفين فقط */}
      {isAdminUser && (
        <div
          className="custom-card p-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm"
          style={{ borderRight: '4px solid var(--accent-color)' }}
        >
          <div className="d-flex align-items-center gap-2">
            <FiShield size={24} style={{ color: 'var(--accent-color)' }} />
            <div>
              <div className="fw-bold" style={{ color: 'var(--text-main)' }}>لوحة إدارة المنصة</div>
              <small className="text-muted">إدارة الدروس والمحتوى والتحليلات الإدارية</small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm fw-bold px-3 py-2 shadow-sm"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'var(--text-on-primary)',
              borderRadius: '8px',
            }}
            onClick={() => setCurrentView('admin')}
          >
            فتح لوحة الإدارة
          </button>
        </div>
      )}

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

      {/* قائمة المجموعات الأربع في نمط الأكورديون */}
      <div className={styles.accordionList}>
        {/* 1. المجموعة الأولى: التطبيق والتحديثات */}
        <AppVersionSection
          isOpen={openSections.app}
          onToggle={() => toggleSection('app')}
          appVersion={appVersion}
        />

        {/* 2. المجموعة الثانية: المحتوى الفقهي وقاعدة المسائل */}
        <ContentSyncSection
          isOpen={openSections.content}
          onToggle={() => toggleSection('content')}
          lessonsCount={lessonsCount}
          reloadFromCloud={reloadFromCloud}
        />

        {/* 3. المجموعة الثالثة: حسابي والخصوصية */}
        <AccountPrivacySection
          isOpen={openSections.account}
          onToggle={() => toggleSection('account')}
          user={user}
          isSyncPausedState={isSyncPausedState}
          onOpenAchievements={onOpenAchievements}
        />

        {/* 4. المجموعة الرابعة: الدعاء والتواصل مع المطوّر */}
        <DeveloperContactSection
          isOpen={openSections.contact}
          onToggle={() => toggleSection('contact')}
        />
      </div>
    </div>
  );
};

export default SettingsView;
