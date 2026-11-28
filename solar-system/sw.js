const CACHE = 'solar-system-v3';
const URLS = ['./','./index.html','./main.js?v=2','./src/Planets.js?v=4','./src/BlackHole.js','./src/HandInput.js?v=5'];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('solar-system-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        if (event.request.mode === 'navigate') {
            try { return await fetch(event.request); }
            catch { return await cache.match('./index.html') || Response.error(); }
        }
        return await cache.match(event.request) || fetch(event.request);
    })());
});

