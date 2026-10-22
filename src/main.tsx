import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './Components/Auth/AuthContext';
import { initAppCheck } from './firebase/config';
import { installFirestoreRecovery } from './utils/firestoreRecovery';
import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import './index.css';
import './styles/exterior.css';

// إنقاذ تلقائي من الأعطال الداخلية القاتلة في Firestore (ca9/b815) قبل أي تهيئة
installFirestoreRecovery();

// App Check (حماية من البوتات): معطّل افتراضيًا.
// السبب: الـ APP_ID في .env.local غير مسجّل في المشروع، فكل تحميل يصدر 400
// ("App not registered") في الكونسول وطلبات فاشلة بلا أي حماية فعلية.
// بعد تسجيل تطبيق الويب الصحيح في Firebase Console وإضافة دومين الموقع لمفتاح reCAPTCHA،
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