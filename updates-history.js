(() => {
  const list = document.getElementById('updateList');
  if (!list) return;

  const STORAGE_KEY = 'wms_update_history';
  const VERSION = 'v1.0.0';
  const now = new Date();

  const seed = [
    {
      version: VERSION,
      date: now.toLocaleDateString('fr-CA'),
      note: 'Vérification de l’intégration du menu, paramètres et navigation rapide.',
    },
  ];

  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const history = Array.isArray(existing) && existing.length ? existing : seed;

  if (!history.some((entry) => entry.version === VERSION)) {
    history.unshift(seed[0]);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 30)));

  list.innerHTML = '';
  history.slice(0, 30).forEach((entry) => {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${entry.version}</strong> — ${entry.date}<br>${entry.note}`;
    list.appendChild(item);
  });
})();
