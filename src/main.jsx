import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { AuthProvider } from './Components/Auth/AuthContext';
import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import './index.css';
import './styles/exterior.css';

createRoot(document.getElementById('root')).render(
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
