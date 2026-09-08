const CACHE = 'eva-wallpaper-v1';
const URLS = ['index.html', 'manifest.json',
              'css/normalize.css', 'css/default.css', 'css/styles.css',
              'js/jquery-2.1.1.min.js', 'js/jquery.parallax.min.js',
              'img/bg.png', 'img/s1.png', 'img/s2.png', 'img/s3.png', 'img/s4.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
  self.skipWaiting();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});