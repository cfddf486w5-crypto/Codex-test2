const CACHE = 'dlwms-ia-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './design-system.css',
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
  './consolidation-ios-dark.png',
  './layout-ios-dark.png',
  './suivi-expedition-ios-dark.png',
  './remise-ios-dark.png',
  './receiving-ios-dark.png',
  './pages/modules.html',
  './pages/history.html',
  './pages/parametres.html',
  './pages/consolidation.html',
  './pages/consolidation/charger.html',
  './pages/consolidation/optimiser.html',
  './pages/consolidation/historique.html',
  './pages/consolidation/statistiques.html',
  './pages/inventaire.html',
  './pages/monitoring.html',
  './pages/remise.html',
  './pages/remise/generer.html',
  './pages/remise/suivant.html',
  './pages/remise/verifier.html',
  './pages/remise/bins.html',
  './pages/reception-conteneur.html',
  './pages/reception-preuve.html',
  './pages/reception-faq.html',
  './header_pallet_arrows.png',
  './charger.png',
  './optimiser.png',
  './historique.png',
  './statistiques.png',
  './assistant_robot.png'
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
