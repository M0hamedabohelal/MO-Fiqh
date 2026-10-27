import { useState } from 'react';
import { FiBookOpen, FiInfo, FiRefreshCw, FiCheck } from 'react-icons/fi';
import styles from '../SettingsView.module.css';
import { SettingsSection, FeedbackAlert } from './SettingsSection';
import type { FeedbackMessage } from './types';
import { isFirebaseConfigured } from '../../../firebase/config';

interface ContentSyncSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  lessonsCount: number;
  reloadFromCloud: (manual?: boolean) => Promise<boolean>;
}

export const ContentSyncSection = ({
  isOpen,
  onToggle,
  lessonsCount,
  reloadFromCloud,
}: ContentSyncSectionProps) => {
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<FeedbackMessage | null>(null);

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

  return (
    <SettingsSection
      id="content"
      icon={<FiBookOpen />}
      title="المحتوى الفقهي وقاعدة المسائل"
      subtitle="المسائل المعتمدة، القاموس، وتحديث المحتوى من السحابة"
      badge={
        <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
          <FiCheck size={14} /> متوفر دون اتصال
        </span>
      }
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className={styles.subCard}>
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
          النصوص الفقهية والقاموس محفوظة ومتاحة على جهازك للقراءة في أي وقت. يمكنك في أي لحظة
          مزامنة أحدث التصويبات والإضافات من السحابة.
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
              {refreshingContent
                ? 'جارٍ جلب المحتوى من السحابة...'
                : 'تحديث المحتوى والقاموس'}
            </span>
          </button>
        </div>

        <FeedbackAlert feedback={refreshFeedback} />
      </div>
    </SettingsSection>
  );
};
