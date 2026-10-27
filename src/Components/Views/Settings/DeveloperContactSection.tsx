import { FiHeart, FiPhone, FiExternalLink, FiFacebook, FiLinkedin } from 'react-icons/fi';
import styles from '../SettingsView.module.css';
import { SettingsSection } from './SettingsSection';

interface DeveloperContactSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const DeveloperContactSection = ({ isOpen, onToggle }: DeveloperContactSectionProps) => {
  return (
    <SettingsSection
      id="contact"
      icon={<FiHeart />}
      title="الدعاء والتواصل مع المطوّر"
      subtitle="طلب دعاء بظهر الغيب وقنوات التواصل المباشر"
      badge={
        <span className={`${styles.statusChip} ${styles.statusInfo}`}>تواصل مباشر</span>
      }
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* قسم الدعاء */}
      <div className={`${styles.subCard} ${styles.prayerSection}`}>
        <div className={styles.prayerHeart} aria-hidden="true">
          <FiHeart />
        </div>
        <h4 className={styles.prayerTitle}>طلب دعاء بظهر الغيب</h4>
        <p className={styles.prayerText}>
          «اللهم اجعل هذا العمل خالصًا لوجهك الكريم، وانفع به كل من قرأه وتعلّمه»
          <br />
          نرجو الدعاء للقائمين على الموقع بظهر الغيب وسؤال التوفيق والسداد في الدارين.
        </p>

        <div className={styles.contactDivider} />

        <h5 className={styles.contactTitle}>للتواصل ومقترحات التطوير مع المطور</h5>

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
      </div>
    </SettingsSection>
  );
};
