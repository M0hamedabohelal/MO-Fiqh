// Self-destructing Service Worker
// تنظيف أي نسخ قديمة من Service Worker
// ملف حيّ: يُخدَّم على /sw.js و /service-worker.js فقط، ويسجّل نفسه ليُنظّف كاش الزوار القدامى ثم يلغي تسجيله.
// لذا لا يستورده أي كود — مستثنى عمدًا في knip.json (لا تحذفه بوصفه "غير مستخدم").
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

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
