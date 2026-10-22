import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// وضع ghpages للنشر على GitHub Pages (مسار فرعي /MO-Fiqh/)
// أي وضع آخر — Firebase Hosting أو غيره — يخدم من الجذر /
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'ghpages' ? '/MO-Fiqh/' : '/',
  build: {
    rollupOptions: {
      output: {
        // تقسيم المكتبات لملفات منفصلة — تحميل أسرع وكاش أفضل
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'react-core';
            // نترك firebase خارج manualChunks تمامًا (return 없음 → undefined) فلا تُفرط في vendor،
            // وتبقى شارد ديناميكي مستقل: firestore تُحمَّل عند طلب المحتوى فقط، وauth عند تسجيل الدخول فقط.
            if (id.includes('firebase') || id.includes('@firebase')) return undefined;
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('react-icons')) return 'icons';
            if (id.includes('fuse.js')) return 'fuse';
            return 'vendor';
          }
        },
      },
    },
  },
}))
