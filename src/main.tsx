import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './Components/Auth/AuthContext';
import { initAppCheck } from './firebase/config';
import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import './index.css';
import './styles/exterior.css';

// App Check (حماية من البوتات): تهيئة مبكرة غير حاجبة — تُتخطى بصمت بلا مفتاح
void initAppCheck();

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