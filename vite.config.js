import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// وضع ghpages للنشر على GitHub Pages (مسار فرعي /MO-Fiqh/)
// أي وضع آخر — Firebase Hosting أو غيره — يخدم من الجذر /
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // PWA: تثبيت الموقع كتطبيق + عمل أوفلاين عبر Service Worker
    VitePWA({
      // prompt: نتحكم في إشعار "تحديث جاهز" بأنفسنا ليظهر زر التحديث
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'الباحث الفقهي',
        short_name: 'فقهي',
        description: 'منصة تعليمية متكاملة لدراسة الفقه الإسلامي بأسلوب عصري ميسّر',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // لون شاشة البداية يطابق الثيم الداكن الافتراضي (#101414) لمنع وميض أبيض عند الفتح
        background_color: '#101414',
        theme_color: '#0f3d3e',
        categories: ['education', 'books'],
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // كل ملفات التطبيق تُخزَّن مسبقاً للعمل أوفلاين (بدون PDF الكبير وصور المشاركة)
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/og-image.png'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // خطوط Google — لا تتغير تقريباً، كاش دائم
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
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
