import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { FiAlertOctagon, FiHome } from 'react-icons/fi';
import { logError } from '../utils/logError';
import { isFatalFirestoreError, firestoreFatalRecovery, isStaleChunkError, reloadToLatest } from '../utils/firestoreRecovery';
import { createIncidentId, recordIncident } from './incident';
import ErrorState, { RetryButton } from '../Components/UI/ErrorState';
import './error-screen.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  // واجهة بديلة مخصصة (لحدود الشاشات) — الافتراضي شاشة الخطأ التفصيلية الجذرية
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  incidentId: string | null;
  retrying: boolean;
}

// ─── E1: شاشة خطأ العرض الكاملة ───
// مبادئها (docs/error-design.md):
// - لا stack trace للمستخدم: التفاصيل في logError + sessionStorage، والواجهة تعرض رمز حادثة فقط.
// - RTL وثيم المستخدم، لا ألوان حمراء صارخة ولا خلفية مستقلة عن التطبيق.
// - إجراءان بترتيب أولوية: إعادة المحاولة (تُعيد تصيير الشجرة) ثم الرئيسية.
// - خروج آمن للحالتين المعروفتين: عطل Firestore القاتل وشارد قديم بعد نشر جديد.

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, incidentId: null, retrying: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // شارد (chunk) اختفى بعد نشر جديد: التبويب القديم يطلب اسم ملف لم يعد موجودًا (404).
    // ليس عطلًا في التطبيق بل دليل قاطع على نسخة أحدث — نُحدّث بدل عرض خطأ.
    if (isStaleChunkError(error)) {
      const id = createIncidentId();
      recordIncident({ id, kind: 'stale', scope: 'boundary', message: error.message });
      logError('boundary.stale', error, { incidentId: id });
      void reloadToLatest();
      return;
    }

    // عطل Firestore الداخلي القاتل (ca9/b815) يُعطّل كل الطلبات حتى إعادة التحميل.
    if (isFatalFirestoreError(error)) {
      const id = createIncidentId();
      recordIncident({ id, kind: 'network', scope: 'boundary.firestore', message: error.message });
      logError('boundary.firestoreFatal', error, { incidentId: id });
      void firestoreFatalRecovery(error);
      return;
    }

    const incidentId = createIncidentId();
    recordIncident({ id: incidentId, kind: 'render', scope: 'boundary', message: error.message });
    logError('boundary.render', error, {
      incidentId,
      componentStack: (errorInfo.componentStack ?? '').slice(0, 1200),
    });
    this.setState({ errorInfo, incidentId });
  }

  private handleRetry = () => {
    // إعادة تصيير الشجرة: تفريغ حالة الحدود يعيد محاولة تحميل الشاشة من جديد بلا reload كامل.
    this.setState({ hasError: false, error: null, errorInfo: null, incidentId: null, retrying: true });
    // إن تكرر السقوط فورًا، ستعود الشاشة نفسها — لا حاجة لمؤقّت هنا.
    setTimeout(() => this.setState({ retrying: false }), 0);
  };

  private handleHome = () => {
    try {
      window.location.replace(`${window.location.origin}/`);
    } catch {
      window.location.reload();
    }
  };

  private handleReport = () => {
    const id = this.state.incidentId ?? '';
    const msg = encodeURIComponent(`رمز الحادثة: ${id}\nالرابط: ${typeof location !== 'undefined' ? location.href : ''}`);
    try {
      window.location.href = `mailto:support@fqh.me?subject=${encodeURIComponent('بلاغ خطأ — يَسِّر')}&body=${msg}`;
    } catch {
      /* لا شيء نفعله إن حجب المتصفح mailto */
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;

      return (
        <div className="error-screen" dir="rtl" lang="ar">
          <ErrorState
            kind="render"
            icon={FiAlertOctagon}
            title="تعذّر عرض هذه الشاشة"
            message="قد يكون الموقع حُدّث للتو أو انقطع الاتصال لحظة التحميل. المحاولة أولًا عادةً تكفي، فإن لم تُجدِ فحدّث الصفحة كاملة."
            incidentId={this.state.incidentId}
            primaryAction={<RetryButton onRetry={this.handleRetry} />}
            secondaryActions={(
              <>
                <button type="button" className="btn btn-sm btn-outline-secondary error-screen-btn" onClick={this.handleHome}>
                  <FiHome size={15} aria-hidden="true" />
                  <span>الرئيسية</span>
                </button>
                <button type="button" className="btn btn-sm btn-link error-screen-report" onClick={this.handleReport}>
                  إبلاغ
                </button>
              </>
            )}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/** بطاقة عطل شاشة واحدة — تُستخدم داخل AppLayout عند حدود كل شاشة */
export const ViewErrorFallback = () => (
  <ErrorState
    kind="unknown"
    title="تعذّر عرض هذه الشاشة"
    message="حدث خطأ في هذه الشاشة وحدها — بقية التطبيق يعمل. أعد التحميل، أو ارجع للرئيسية وتابع من شاشة أخرى."
    primaryAction={<RetryButton onRetry={() => window.location.reload()} label="إعادة التحميل" />}
    secondaryActions={(
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary error-screen-btn"
        onClick={() => { window.location.hash = ''; }}
      >
        الرئيسية
      </button>
    )}
  />
);

