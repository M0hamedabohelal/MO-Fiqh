import { useState, useCallback } from 'react';
import {
  FiShield,
  FiCheck,
  FiAward,
  FiChevronLeft,
  FiRefreshCw,
  FiTrash2,
  FiBell,
  FiClock,
  FiFileText,
  FiExternalLink,
} from 'react-icons/fi';
import styles from '../SettingsView.module.css';
import { SettingsSection, FeedbackAlert } from './SettingsSection';
import type { FeedbackMessage } from './types';
import { safeRemove } from '../../../utils/safeStorage';
import { setSyncDisabled } from '../../../utils/librarySync';
import { useReadingReminder } from '../../../hooks/useReadingReminder';

interface AccountPrivacySectionProps {
  isOpen: boolean;
  onToggle: () => void;
  user: { uid: string; email?: string | null; displayName?: string | null } | null;
  isSyncPausedState: boolean;
  onOpenAchievements: () => void;
}

export const AccountPrivacySection = ({
  isOpen,
  onToggle,
  user,
  isSyncPausedState,
  onOpenAchievements,
}: AccountPrivacySectionProps) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingCloud, setClearingCloud] = useState(false);
  const [cloudFeedback, setCloudFeedback] = useState<FeedbackMessage | null>(null);

  const reminder = useReadingReminder();
  const [reminderFeedback, setReminderFeedback] = useState<FeedbackMessage | null>(null);

  const handleToggleReminder = async (): Promise<void> => {
    setReminderFeedback(null);
    if (reminder.isEnabled) {
      reminder.disableReminder();
      setReminderFeedback({
        type: 'info',
        text: 'تم إيقاف تذكير القراءة اليومي.',
      });
    } else {
      const ok = await reminder.enableReminder();
      if (ok) {
        setReminderFeedback({
          type: 'success',
          text: 'تم تفعيل تذكير الورد الفقهي اليومي بنجاح!',
        });
      } else {
        setReminderFeedback({
          type: 'warning',
          text: 'يرجى السماح بإذن الإشعارات من إعدادات المتصفح لتفعيل التذكير.',
        });
      }
    }
  };

  const handleTestReminder = (): void => {
    const ok = reminder.triggerTestReminder();
    if (ok) {
      setReminderFeedback({
        type: 'success',
        text: 'تم إرسال إشعار تجريبي لهاتفك/حاسوبك الآن.',
      });
    } else {
      setReminderFeedback({
        type: 'warning',
        text: 'تعذر إرسال الإشعار، تأكد من تفعيل إذن الإشعارات في المتصفح.',
      });
    }
  };

  const handleClearCloudData = async (): Promise<void> => {
    if (!user || clearingCloud) return;
    setClearingCloud(true);
    setCloudFeedback(null);
    try {
      setSyncDisabled(user.uid, true);
      const [{ getFirestore }, fs] = await Promise.all([
        import('../../../firebase/config'),
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

  const handleResumeSync = useCallback((): void => {
    if (!user) return;
    setSyncDisabled(user.uid, false);
    setCloudFeedback({
      type: 'success',
      text: 'تمت إعادة تفعيل المزامنة السحابية بنجاح؛ سيتم رفع بياناتك وحفظها تلقائيًا.',
    });
  }, [user]);

  return (
    <SettingsSection
      id="account"
      icon={<FiShield />}
      title="حسابي والخصوصية"
      subtitle="سجل القراءة، الإنجازات، والنسخ الاحتياطي السحابي"
      badge={
        user ? (
          isSyncPausedState ? (
            <span className={`${styles.statusChip} ${styles.statusWarning}`}>
              المزامنة متوقفة
            </span>
          ) : (
            <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
              <FiCheck size={14} /> متزامن سحابيًا
            </span>
          )
        ) : (
          <span className={`${styles.statusChip} ${styles.statusInfo}`}>وضع الزائر</span>
        )
      }
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* البطاقة الفرعية 1: مسيرتي الفقهية وإنجازاتي */}
      <div className={styles.subCard}>
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
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--brand-gold) 20%, transparent), color-mix(in srgb, var(--brand-gold) 5%, transparent))',
                  color: 'var(--accent-color)',
                }}
              >
                <FiAward size={22} />
              </div>
              <div>
                <h4 id="achievements-heading" className={styles.cardTitle}>
                  إنجازاتي ومواظبتي
                </h4>
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
      </div>

      {/* البطاقة الفرعية 2: الخصوصية والمزامنة السحابية للمستخدم المسجل */}
      {user ? (
        <div className={styles.subCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={styles.cardIcon}>
                <FiShield />
              </div>
              <h4 id="privacy-heading" className={styles.cardTitle}>
                الخصوصية والمزامنة السحابية
              </h4>
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
                  className={styles.btnDangerSolid}
                  onClick={handleClearCloudData}
                  disabled={clearingCloud}
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

          <FeedbackAlert feedback={cloudFeedback} />
        </div>
      ) : (
        <div className={styles.subCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={styles.cardIcon}>
                <FiShield />
              </div>
              <h4 className={styles.cardTitle}>المزامنة السحابية للبيانات</h4>
            </div>
            <span className={`${styles.statusChip} ${styles.statusInfo}`}>حفظ محلي</span>
          </div>
          <p className={styles.cardDesc} style={{ marginBottom: 0 }}>
            أنت تتصفح الموقع بوضع الزائر؛ جميع علامات الوقف، المفضلة، والملاحظات تُحفظ بأمان على هذا
            الجهاز فقط. يمكنك تسجيل الدخول في أي وقت لحفظ بياناتك سحابيًا والوصول إليها من أي جهاز آخر.
          </p>
        </div>
      )}

      {/* البطاقة الفرعية 3: تذكير الورد الفقهي اليومي */}
      <div className={styles.subCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiBell />
            </div>
            <h4 id="reminder-heading" className={styles.cardTitle}>
              تذكير الورد الفقهي اليومي
            </h4>
          </div>
          {reminder.isSupported ? (
            reminder.isEnabled ? (
              <span className={`${styles.statusChip} ${styles.statusSuccess}`}>
                <FiCheck size={14} /> التذكير مفعّل
              </span>
            ) : (
              <span className={`${styles.statusChip} ${styles.statusInfo}`}>التذكير متوقف</span>
            )
          ) : (
            <span className={`${styles.statusChip} ${styles.statusWarning}`}>غير مدعوم بالجهاز</span>
          )}
        </div>

        <p className={styles.cardDesc}>
          إشعار محلي لطيف يذكّرك بقراءة وردك اليومي ومسألة فقهية نافعة في ضوء الكتاب والسنة، مرتبط بسلسلة مواظبتك اليومية.
        </p>

        {reminder.isSupported ? (
          <div className={styles.actionRow} style={{ flexDirection: 'column', gap: '0.85rem', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                className={reminder.isEnabled ? styles.btnSecondary : styles.btnPrimary}
                onClick={handleToggleReminder}
                aria-label={reminder.isEnabled ? 'إيقاف تذكير الورد اليومي' : 'تفعيل تذكير الورد اليومي'}
              >
                <FiBell />
                <span>{reminder.isEnabled ? 'إيقاف التذكير اليومي' : 'تفعيل التذكير اليومي'}</span>
              </button>

              {reminder.isEnabled && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={handleTestReminder}
                  title="إرسال إشعار تجريبي الآن للتأكد"
                >
                  <FiRefreshCw />
                  <span>تجربة الإشعار الآن</span>
                </button>
              )}
            </div>

            {reminder.isEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <FiClock />
                <span>الوقت المفضل للتذكير:</span>
                <input
                  type="time"
                  value={reminder.preferredTime}
                  onChange={(e) => reminder.setPreferredTime(e.target.value)}
                  style={{
                    background: 'var(--input-bg, #1a2020)',
                    color: 'var(--text-main, #e6e8e6)',
                    border: '1px solid var(--border-color, #2a3535)',
                    borderRadius: '6px',
                    padding: '0.25rem 0.5rem',
                    fontFamily: 'inherit',
                  }}
                  aria-label="اختيار وقت التذكير اليومي"
                />
              </div>
            )}
          </div>
        ) : (
          <p className={styles.cardDesc} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ميزة إشعارات التصفح غير مدعومة على متصفحك أو بيئتك الحالية.
          </p>
        )}

        <FeedbackAlert feedback={reminderFeedback} />
      </div>

      {/* البطاقة الفرعية 4: وثائق وروابط المنصة القانونية */}
      <div className={styles.subCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardIcon}>
              <FiFileText />
            </div>
            <h4 id="legal-heading" className={styles.cardTitle}>
              وثائق المنصة والصفحات القانونية
            </h4>
          </div>
          <span className={`${styles.statusChip} ${styles.statusSuccess}`}>رسمية وموثّقة</span>
        </div>

        <p className={styles.cardDesc}>
          منهجية المنصة، الشروط وحقوق النشر، وسياسة الخصوصية وحماية بيانات الزوار.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
          <a
            href="/about/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
            style={{ justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none' }}
          >
            <span>عن المنصة والمنهجية</span>
            <FiExternalLink size={16} />
          </a>
          <a
            href="/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
            style={{ justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none' }}
          >
            <span>سياسة الخصوصية</span>
            <FiExternalLink size={16} />
          </a>
          <a
            href="/terms/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
            style={{ justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none' }}
          >
            <span>شروط الاستخدام</span>
            <FiExternalLink size={16} />
          </a>
          <a
            href="/disclaimer/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
            style={{ justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none' }}
          >
            <span>إخلاء المسؤولية الفقهية</span>
            <FiExternalLink size={16} />
          </a>
          <a
            href="/copyright/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
            style={{ justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none' }}
          >
            <span>حقوق النشر والملكية</span>
            <FiExternalLink size={16} />
          </a>
        </div>
      </div>
    </SettingsSection>
  );
};
