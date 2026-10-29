import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './Components/Auth/AuthContext';
import { installFirestoreRecovery } from './utils/firestoreRecovery';
import { setupDeferredGA } from './utils/analytics';
import { hashFromCleanPath } from './hooks/useHashRoute';
import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import './index.css';
import './styles/exterior.css';

// ─── روابط نظيفة (/lessons/1/، /books/كتاب الصلاة/) → هاش قبل أن يقرأه الموجّه ───
// صفحات SEO الثابتة تعلن هذا المسار كـ canonical وزرّها يشير إليه، فلازم يفتح التطبيق
// المسألة نفسها. replaceState (لا push) حتى لا يترك زرُّ الرجوع مسارًا بلا حالة مطابقة.
// يُنفَّذ قبل createRoot لأن useHashRoute يقرأ window.location.hash في أول تصيير.
if (!window.location.hash) {
  const hash = hashFromCleanPath(window.location.pathname);
  if (hash) {
    window.__currentCleanPath = window.location.pathname;
    window.history.replaceState({ idx: 0 }, '', hash);
  }
}

// إنقاذ تلقائي من الأعطال الداخلية القاتلة في Firestore (ca9/b815) قبل أي تهيئة
installFirestoreRecovery();

// تحميل تحليلات GA4 فقط بعد تفاعل المستخدم (خصوصية + أداء LCP)
setupDeferredGA();

// App Check (حماية من البوتات): تحميل مؤجل فقط عند التفعيل الصريح لتسريع التحميل الأولي
if (import.meta.env.VITE_ENABLE_APPCHECK === 'true') {
  void import('./firebase/config').then((m) => m.initAppCheck());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);