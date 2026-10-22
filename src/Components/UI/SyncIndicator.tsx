import type { ReactNode } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiWifiOff, FiRefreshCw, FiHardDrive } from 'react-icons/fi';
import type { UnifiedSyncState } from '../../utils/syncStatus';
import './SyncIndicator.css';

// العلامة الوحيدة للمزامنة في التطبيق كله.
// بدل خمسة مؤشرات متفرقة (المحتوى، المكتبة، علامة الوقوف، التفضيلات، صلاحية المشرف)
// نعرض علامة واحدة تلخّص الكل: نجحت المزامنة أم لا.
// عند النجاح: علامة صح واحدة فقط. عند وجود ما يستحق التدخل: علامة قابلة للضغط لإعادة المحاولة.

interface SyncIndicatorProps {
  state: UnifiedSyncState;
  /** الضغط على العلامة عندات الفشل/النقص */
  onRetry?: () => void | Promise<unknown>;
  /** هل المحاولة جارية الآن (لمنع النقر المزدوج)؟ */
  retrying?: boolean;
  /** نص إجمالي مختصر يُعرض بجانب العلامة (اختياري) */
  detail?: ReactNode;
  /** حجم أصغر للشريط العلوي */
  compact?: boolean;
}

interface Visual {
  icon: ReactNode;
  label: string;
  title: string;
  color: string;
  clickable: boolean;
}

const visualFor = (state: UnifiedSyncState): Visual => {
  switch (state) {
    case 'synced':
      return {
        icon: <FiCheckCircle />,
        label: 'كل شيء متزامن',
        title: 'تم تحميل المسائل ومزامنة المحتوى وبيانات الحساب وعلامات الوقوف بنجاح.',
        color: '#27ae60',
        clickable: false,
      };
    case 'syncing':
      return {
        icon: <FiRefreshCw className="sync-indicator-spin" />,
        label: 'جارٍ المزامنة',
        title: 'جارٍ تحميل المسائل ومزامنة بيانات الحساب...',
        color: '#f39c12',
        clickable: false,
      };
    case 'offline':
      return {
        icon: <FiWifiOff />,
        label: 'غير متصل',
        title: 'لا يوجد اتصال الآن؛ المحتوى المتاح يعمل والتغييرات محفوظة على الجهاز وتُزامن تلقائيًا عند عودة الاتصال.',
        color: '#e74c3c',
        clickable: false,
      };
    case 'error':
      return {
        icon: <FiAlertTriangle />,
        label: 'تعذرت المزامنة',
        title: 'لم تكتمل المزامنة. التغييرات محفوظة على الجهاز — اضغط لإعادة المحاولة.',
        color: '#e74c3c',
        clickable: true,
      };
    case 'partial':
      return {
        icon: <FiAlertTriangle />,
        label: 'لم تُؤكَّد المزامنة',
        title: 'بعض البيانات لم يُؤكَّد رفعها للحساب. المحفوظ على الجهاز آمن — اضغط لإعادة المحاولة.',
        color: '#f39c12',
        clickable: true,
      };
    default:
      return {
        icon: <FiHardDrive />,
        label: 'محلي',
        title: 'يعمل التطبيق بالنسخة المحلية.',
        color: '#a77c2d',
        clickable: false,
      };
  }
};

const SyncIndicator = ({ state, onRetry, retrying = false, detail, compact = false }: SyncIndicatorProps) => {
  const visual = visualFor(state);
  const canClick = visual.clickable && Boolean(onRetry) && !retrying;
  const showSpinner = retrying || state === 'syncing';

  const content = (
    <>
      <span className="sync-indicator-icon" style={state === 'syncing' ? { display: 'inline-flex', animation: 'sync-spin 1.1s linear infinite' } : undefined}>
        {retrying ? <FiRefreshCw /> : visual.icon}
      </span>
      <span>{retrying ? 'جارٍ إعادة المحاولة...' : visual.label}</span>
      {detail && !compact && <span className="sync-indicator-detail d-none d-lg-inline">{detail}</span>}
    </>
  );

  const sharedStyle = {
    color: visual.color,
    fontSize: compact ? '0.78rem' : '0.84rem',
    fontWeight: 600,
    textDecoration: 'none',
  } as const;

  if (canClick) {
    return (
      <button
        type="button"
        className="btn btn-link p-0 d-inline-flex align-items-center gap-1 sync-indicator"
        style={sharedStyle}
        onClick={() => { void onRetry?.(); }}
        title={`${visual.title} (اضغط لإعادة المحاولة)`}
        aria-label={`${visual.label} — اضغط لإعادة المحاولة`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className="d-inline-flex align-items-center gap-1 sync-indicator"
      style={sharedStyle}
      role="status"
      aria-live="polite"
      aria-label={`${visual.label} — ${visual.title}`}
      title={visual.title}
    >
      {content}
      {showSpinner && <span className="visually-hidden">جارٍ المزامنة</span>}
    </span>
  );
};

export default SyncIndicator;
