const cacheName = '3501-pwa-cache-v1';
const assetsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/scripts.js',
  '/images/RID3501_Logo.png',
  '/images/apple-touch-icon.png'
];

// 安裝 Service Worker 並緩存靜態資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// 啟用 Service Worker 並清理舊的緩存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== cacheName) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 攔截請求並處理緩存
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin === 'https://www.googleapis.com') {
    event.respondWith(
      caches.open(cacheName).then(cache => {
        return cache.match(event.request).then(response => {
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
