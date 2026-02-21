const CACHE = 'dlwms-ia-v3';
const ASSETS = [
  './',
  './index.html',
  './ia_auto.html',
  './manifest.json',
  './assets/style.css',
  './assets/app.css',
  './assets/print.css',
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
  './js/utils.js',
  './js/kb_store.js',
  './js/kb_validate.js',
  './js/search_engine.js',
  './js/export_report.js',
  './js/guided_diag.js',
  './js/pwa.js',
  './js/ia_auto.js',
  './data/auto_kb.json',
  './data/diag_flows.json',
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
