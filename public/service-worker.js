// Service Worker لمنصة يَسِّر — PWA ودعم القراءة دون اتصال (Offline Reading)
// إستراتيجية آمنة تمنع تعليق الكاش: Network-First للصفحات مع كاش تلقائي للأصول المستقرة

const CACHE_NAME = 'yasser-pwa-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// تثبيت الـ Service Worker وحفظ نواة التطبيق الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {
        // تجاهل أخطاء الشبكة أثناء التثبيت
      });
    })
  );
  self.skipWaiting();
});

// تفعيل وتطهير أي نسخ كاش قديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// التعامل مع الطلبات (Fetch)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // استبعاد طلبات فايربيز والمصادقة واليوتيوب (لها آليات اتصال خاصة)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('googlevideo.com') ||
    url.hostname.includes('cloudinary.com')
  ) {
    return;
  }

  // ١) طلبات التنقل بين الصفحات (HTML Navigation): Network-First
  // نطلب الصفحة من الشبكة أولاً لضمان وصول التحديثات فوراً، فإن انقطعت الشبكة نُعيد النسخة المحفوظة أوفلاين
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          return fallback || Response.error();
        })
    );
    return;
  }

  // ٢) أصول Vite المبنية المرمزة بهاش (/assets/*): Cache-First
  // بما أن اسمها يحمل هاش المحتوى (مثل index-BsFqVczE.css)، فهي غير متغيرة
  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ٣) خطوط جوجل: Stale-While-Revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ٤) باقي الملفات المحلية الثابتة (أيقونات، صور، إلخ): Stale-While-Revalidate
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
