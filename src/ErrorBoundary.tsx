import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import EmptyState from './Components/UI/EmptyState';
import { FiAlertTriangle } from 'react-icons/fi';
import { isFatalFirestoreError, firestoreFatalRecovery, isStaleChunkError, reloadToLatest } from './utils/firestoreRecovery';

interface ErrorBoundaryProps {
  children: ReactNode;
  // واجهة بديلة مخصصة (لحدود الشاشات) — الافتراضي شاشة الخطأ التفصيلية الجذرية
  fallback?: ReactNode;
}

// بطاقة ودية لأعطال الشاشات — زر واحد يعيد التحميل (يُنصح به بعد أي نشر جديد)
export const ViewErrorFallback = () => (
  <EmptyState
    icon={FiAlertTriangle}
    title="تعذّر عرض هذه الشاشة"
    message="حدث خطأ غير متوقع — جرّب إعادة التحميل، وإن تكرر أبلغ المطور."
  >
    <button className="btn btn-primary mt-1" onClick={() => window.location.reload()}>
      إعادة تحميل الصفحة
    </button>
  </EmptyState>
);

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
    // عطل Firestore الداخلي القاتل (ca9/b815) يُعطّل كل الطلبات حتى إعادة التحميل.
    // لا نترك المستخدم أمام شاشة خطأ دائمة: نتجاهل حدود هذا المكوّن ونُعيد التحميل.
    // كان هذا المسار لا يعمل على الإنتاج لأن recoverFromFatalFirestoreError تعيد true
    // (الجلسة كانت في نافذة الحماية) فنبقى على شاشة الخطأ بلا فعل — الآن نُبلّغ دائمًا.
    if (isFatalFirestoreError(error)) {
      void firestoreFatalRecovery(error);
      return;
    }
    // شارد (chunk) اختفى بعد نشر جديد: التبويب القديم يطلب اسم ملف لم يعد موجودًا (404).
    // هذا ليس عطلًا في التطبيق بل دليل قاطع على وجود نسخة أحدث — نُحدّث بدل عرض خطأ.
    // بدونه يرى المستخدم «تعذّر عرض هذه الشاشة» ويظن أن التطبيق مكسور.
    if (isStaleChunkError(error)) {
      void reloadToLatest();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div style={{ padding: '40px', color: '#e74c3c', direction: 'ltr', textAlign: 'left', background: '#f8d7da', minHeight: '100vh' }}>
          <h2>عذراً، حدث خطأ غير متوقع!</h2>
          <p>يرجى تصوير هذه الشاشة وإرسالها للمطور:</p>
          <hr />
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', background: '#fff', padding: '15px', borderRadius: '8px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
