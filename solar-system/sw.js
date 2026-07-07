const CACHE_NAME = 'solar-system-v1';
const urlsToCache = [
    './',
    './index.html',
    './main.js',
    './src/Planets.js',
    './src/BlackHole.js',
    './src/HandInput.js'
];
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});
