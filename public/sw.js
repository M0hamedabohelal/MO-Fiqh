// Self-destructing Service Worker
// الهدف: تنظيف أي نسخ قديمة من Service Worker أو كاش PWA لدى الزوار القدامى تلقائيًا
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// تمرير جميع الطلبات للشبكة مباشرة دون تخزين
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
