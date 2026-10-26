import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// النشر على Firebase Hosting من الجذر /. (وضع GitHub Pages للمسار الفرعي /MO-Fiqh/
// أُزيل مع فرع gh-pages — كان ميتًا من غير أي مستخدم.)
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff,woff2}'],
        globIgnores: [
          '**/fiqh-book.pdf',
          'lessons/**',
          'books/**',
          'scripts/**',
          'og/**',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/lessons/, /^\/books/, /^\/og\//, /\.pdf$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
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
    testTimeout: 15000,
    alias: {
      'virtual:pwa-register': new URL('./src/test/mockPwaRegister.ts', import.meta.url).pathname,
    },
  },
})
