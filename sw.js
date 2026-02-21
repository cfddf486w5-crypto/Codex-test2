const CACHE = 'dlwms-ia-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/style.css',
  './app/core.js',
  './app/router.js',
  './app/storage.js',
  './app/ai-engine.js',
  './app/vector-engine.js',
  './app/neural-lite.js',
  './app/flow-engine.js',
  './app/optimization-engine.js',
  './app/anomaly-engine.js',
  './app/prediction-engine.js',
  './app/trainer.js',
  './app/simulator.js',
  './app/ai-worker.js',
  './app/improvements.js',
  './pages/dashboard.html',
  './pages/ai-center.html',
  './pages/reception.html',
  './pages/remise.html',
  './pages/consolidation.html',
  './pages/inventaire.html',
  './pages/layout.html',
  './pages/parametres.html',
  './pages/prompt.html',
  './pages/monitoring.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
