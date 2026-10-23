import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './Components/Auth/AuthContext';
import { initAppCheck } from './firebase/config';
import { installFirestoreRecovery } from './utils/firestoreRecovery';
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

// App Check (حماية من البوتات): معطّل افتراضيًا.
// السبب: تطبيق الويب غير مُسجَّل في App Check لهذا المشروع، فكل تحميل يصدر 400
// ("App not registered") في الكونسول مع تحميل reCAPTCHA بلا أي حماية فعلية.
// (الـ APP_ID والقيم في .env.local مطابقة لإعدادات المشروع — النقص في تسجيل App Check نفسه.)
// بعد تسجيل التطبيق في App Check وإضافة دومين الموقع لمفتاح reCAPTCHA،
// فعّله بضبط VITE_ENABLE_APPCHECK=true ثم فعّل الإنفاذ في القواعد.
if (import.meta.env.VITE_ENABLE_APPCHECK === 'true') void initAppCheck();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {/* احترام تفضيل تقليل الحركة في النظام — يعطّل الأنيميشن الثقيل تلقائيًا */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);