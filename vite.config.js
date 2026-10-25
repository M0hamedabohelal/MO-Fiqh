import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// النشر على Firebase Hosting من الجذر /. (وضع GitHub Pages للمسار الفرعي /MO-Fiqh/
// أُزيل مع فرع gh-pages — كان ميتًا من غير أي مستخدم.)
export default defineConfig({
  plugins: [react()],
  base: '/',
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
  test: {
    pool: 'threads',
  },
})
