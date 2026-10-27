import React from 'react';
import { FiChevronDown, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import styles from '../SettingsView.module.css';
import type { FeedbackMessage } from './types';

export interface SettingsSectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const SettingsSection = ({
  id,
  icon,
  title,
  subtitle,
  badge,
  isOpen,
  onToggle,
  children,
}: SettingsSectionProps) => {
  const headerId = `section-header-${id}`;
  const panelId = `section-panel-${id}`;

  return (
    <section className={styles.accordionSection} aria-labelledby={headerId}>
      <button
        type="button"
        id={headerId}
        className={`${styles.accordionHeaderBtn} ${isOpen ? styles.accordionHeaderOpen : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className={styles.accordionHeaderLeft}>
          <div
            className={`${styles.accordionHeaderIcon} ${
              isOpen ? styles.accordionHeaderIconActive : ''
            }`}
          >
            {icon}
          </div>
          <div className={styles.accordionTitleGroup}>
            <div className={styles.accordionTitleRow}>
              <h3 className={styles.accordionTitle}>{title}</h3>
              {badge && <div className={styles.accordionBadgeDesktop}>{badge}</div>}
            </div>
            {subtitle && <span className={styles.accordionSubtitle}>{subtitle}</span>}
            {badge && <div className={styles.accordionBadgeMobile}>{badge}</div>}
          </div>
        </div>

        <div
          className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ''}`}
          aria-hidden="true"
        >
          <FiChevronDown size={20} />
        </div>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`${styles.accordionPanel} ${
          isOpen ? styles.accordionPanelOpen : styles.accordionPanelClosed
        }`}
      >
        <div className={styles.accordionContentWrapper}>{children}</div>
      </div>
    </section>
  );
};

export const FeedbackAlert = ({ feedback }: { feedback: FeedbackMessage | null }) => {
  if (!feedback) return null;
  const alertClass =
    feedback.type === 'success'
      ? styles.feedbackAlertSuccess
      : feedback.type === 'warning'
      ? styles.feedbackAlertWarning
      : feedback.type === 'error'
      ? styles.feedbackAlertError
      : styles.feedbackAlertInfo;

  return (
    <div role="status" className={`${styles.feedbackAlert} ${alertClass}`}>
      {feedback.type === 'success' && <FiCheckCircle size={18} />}
      {feedback.type === 'warning' && <FiAlertTriangle size={18} />}
      {feedback.type === 'error' && <FiAlertTriangle size={18} />}
      {feedback.type === 'info' && <FiInfo size={18} />}
      <span>{feedback.text}</span>
    </div>
  );
};
