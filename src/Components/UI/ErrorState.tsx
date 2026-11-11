import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FiAlertTriangle, FiWifiOff, FiCompass, FiShieldOff, FiClock, FiRotateCw } from 'react-icons/fi';
import type { ErrorKind } from '../../errors/types';
import './error-state.css';

// ─── بطاقة الخطأ الموحدة (E2/E5) ───
// بديل EmptyState في مسارات الفشل: نفس الهوية البصرية لكن مع
//   h2 (لا h5) حتى لا ينكسر ترتيب العناوين تحت h1 المخفي في AppLayout،
//   وألوان دلالية من التوكنات، ورمز حادثة صغير قابل للنسخ، وإجراءات مرتبة الأولوية.

const ICONS: Partial<Record<ErrorKind, IconType>> = {
  network: FiAlertTriangle,
  timeout: FiClock,
  offline: FiWifiOff,
  notfound: FiCompass,
  permission: FiShieldOff,
  quota: FiClock,
  unknown: FiAlertTriangle,
};

export interface ErrorStateProps {
  kind?: ErrorKind;
  title: string;
  message?: ReactNode;
  /** رمز الحادثة err_xxxxxxxx — يظهر سطرًا صغيرًا قابلاً للتحديد */
  incidentId?: string | null;
  /** الإجراء الرئيسي (زر primary) */
  primaryAction?: ReactNode;
  /** إجراءات ثانوية (روابط/أزرار خفيفة) */
  secondaryActions?: ReactNode;
  /** أيقونة مخصصة تتقدم على أيقونة العائلة */
  icon?: IconType;
  className?: string;
}

const ErrorState = ({
  kind = 'unknown',
  title,
  message,
  incidentId,
  primaryAction,
  secondaryActions,
  icon,
  className = '',
}: ErrorStateProps) => {
  const Icon = icon ?? ICONS[kind] ?? FiAlertTriangle;

  return (
    <div
      className={`error-state ${className}`.trim()}
      role="alert"
      aria-live="assertive"
      data-kind={kind}
    >
      <div className="error-state-icon" aria-hidden="true">
        <Icon size={30} />
      </div>
      <h2 className="error-state-title">{title}</h2>
      {message && <p className="error-state-message">{message}</p>}
      {(primaryAction || secondaryActions) && (
        <div className="error-state-actions">
          {primaryAction}
          {secondaryActions}
        </div>
      )}
      {incidentId && (
        <p className="error-state-code" dir="ltr">
          {incidentId}
        </p>
      )}
    </div>
  );
};

/** زر إعادة المحاولة الموحد — يحفظ عدّاد المحاولات لعرضه كمعلومة لا كعقاب */
export const RetryButton = ({
  onRetry,
  label = 'إعادة المحاولة',
  disabled,
  busy,
}: {
  onRetry: () => void;
  label?: string;
  disabled?: boolean;
  busy?: boolean;
}) => (
  <button
    type="button"
    className="btn btn-sm btn-primary error-retry-btn"
    onClick={onRetry}
    disabled={disabled || busy}
    aria-busy={busy ? 'true' : undefined}
  >
    {busy ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <FiRotateCw size={15} aria-hidden="true" />}
    <span>{busy ? 'جارٍ المحاولة...' : label}</span>
  </button>
);

export default ErrorState;
