const CACHE = 'eva-wallpaper-v2';
const URLS = ['index.html','manifest.json','css/normalize.css','css/default.css','css/styles.css','img/bg.png','img/s1.png','img/s2.png','img/s3.png','img/s4.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('eva-wallpaper-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      try { return await fetch(request); }
      catch { return await cache.match('index.html') || Response.error(); }
    }
    return await cache.match(request) || fetch(request);
  })());
});
