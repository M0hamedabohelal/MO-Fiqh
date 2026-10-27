import { useState, useSyncExternalStore } from 'react';
import { FiSliders } from 'react-icons/fi';
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
  const { user, setCurrentView, reloadFromCloud, lessonsCount, appVersion } = useApp();

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
