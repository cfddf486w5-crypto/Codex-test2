(() => {
  const DRAFT_KEY = 'DLWMS_CONTAINER_DRAFT_V1';
  const HISTORY_KEY = 'DLWMS_CONTAINER_HISTORY_V1';
  const BINMAP_KEY = 'DLWMS_BINMAP';
  const DB_NAME = 'DLWMS_RECEIPTS_DB_V1';
  const STORE = 'photos';

  const NAV = [
    { key: 'dashboard', label: 'Accueil', icon: '🏠' },
    { key: 'ia', label: 'IA', icon: '🤖' },
    { key: 'consolidation', label: 'Consolidation', icon: '📦' },
    { key: 'reception-conteneur', label: 'Réception', icon: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 5h18v4H3zm1 6h7v8H4zm9 0h7v8h-7z"/></svg>' },
  ];

  const state = {
    view: 'dashboard',
    draft: { container: '', asn: '', dock: '', date: '', notes: '', lines: [], defaultBinPrefix: '' },
    history: [],
    binMap: {},
  };

  const toast = (message) => {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node._t);
    node._t = setTimeout(() => node.classList.remove('show'), 1700);
  };

  const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  async function addPhoto(blob) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), blob });
    return tx.complete;
  }

  async function getPhotos() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function persistDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
    localStorage.setItem(BINMAP_KEY, JSON.stringify(state.binMap));
    const badge = document.getElementById('rcDraftBadge');
    if (badge) badge.textContent = `Brouillon ${new Date().toLocaleTimeString('fr-CA')}`;
  }

  function loadPersisted() {
    try { state.draft = { ...state.draft, ...(JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')) }; } catch {}
    try { state.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch {}
    try { state.binMap = JSON.parse(localStorage.getItem(BINMAP_KEY) || '{}'); } catch {}
  }

  function mountNav() {
    const tabbar = document.getElementById('tabbar');
    if (!tabbar || tabbar.dataset.rcMounted) return;
    tabbar.dataset.rcMounted = '1';
    tabbar.innerHTML = NAV.map((n) => `<button class="tab-item ${state.view === n.key ? 'active' : ''}" data-view="${n.key}"><span class="tab-icon">${n.icon}</span><span>${n.label}</span></button>`).join('');
    tabbar.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => openView(btn.dataset.view, true));
    });
  }

  async function mountReceptionPage() {
    const appView = document.getElementById('appView');
    if (!appView) return;
    const html = await fetch('./modules/reception-conteneur/reception-conteneur.html').then((r) => r.text());
    appView.innerHTML = html;
    bindReceptionUi();
  }

  function renderPlaceholder(title) {
    const appView = document.getElementById('appView');
    if (!appView) return;
    appView.innerHTML = `<section class="panel"><h1>${title}</h1><p class="muted">Vue existante conservée.</p></section>`;
  }

  async function openView(view, pushHash = false) {
    state.view = view;
    document.querySelectorAll('#tabbar .tab-item').forEach((x) => x.classList.toggle('active', x.dataset.view === view));
    if (pushHash) location.hash = view === 'reception-conteneur' ? '#/reception-conteneur' : `#/${view}`;
    if (view === 'reception-conteneur') await mountReceptionPage();
    else if (view === 'dashboard') renderPlaceholder('Accueil');
    else if (view === 'ia') renderPlaceholder('Assistant IA');
    else if (view === 'consolidation') renderPlaceholder('Consolidation');
  }

  function bindReceptionUi() {
    const root = document.getElementById('receptionConteneurRoot');
    if (!root) return;
    const setVal = (id, key) => { const n = root.querySelector(id); if (n) n.value = state.draft[key] || ''; };
    setVal('#rcContainer', 'container'); setVal('#rcAsn', 'asn'); setVal('#rcDock', 'dock'); setVal('#rcDate', 'date'); setVal('#rcNotes', 'notes'); setVal('#rcDefaultBin', 'defaultBinPrefix');

    root.querySelectorAll('[data-rc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.rcTab;
        root.querySelectorAll('[data-rc-tab]').forEach((x) => x.classList.toggle('active', x === btn));
        root.querySelectorAll('[data-rc-pane]').forEach((pane) => pane.classList.toggle('active', pane.dataset.rcPane === t));
      });
    });

    ['rcContainer', 'rcAsn', 'rcDock', 'rcDate', 'rcNotes', 'rcDefaultBin'].forEach((id) => {
      root.querySelector(`#${id}`)?.addEventListener('input', (e) => {
        const m = { rcContainer: 'container', rcAsn: 'asn', rcDock: 'dock', rcDate: 'date', rcNotes: 'notes', rcDefaultBin: 'defaultBinPrefix' };
        state.draft[m[id]] = e.target.value;
        persistDraft();
      });
    });

    root.querySelector('#rcSaveDraft')?.addEventListener('click', () => { persistDraft(); toast('Brouillon sauvegardé'); });
    root.querySelector('#rcClearDraft')?.addEventListener('click', () => {
      state.draft = { container: '', asn: '', dock: '', date: '', notes: '', lines: [], defaultBinPrefix: state.draft.defaultBinPrefix || '' };
      persistDraft();
      bindReceptionUi();
    });

    root.querySelector('#rcAddBin')?.addEventListener('click', () => {
      const bin = root.querySelector('#rcBin').value.trim().toUpperCase();
      const item = root.querySelector('#rcItem').value.trim().toUpperCase();
      const qty = Number(root.querySelector('#rcQty').value);
      if (!bin || !item || !Number.isFinite(qty) || qty < 0) return toast('Validation bins: champs invalides');
      state.draft.lines.push({ bin, item, qty, at: new Date().toISOString() });
      state.binMap[bin] = item;
      persistDraft();
      renderBins();
    });

    root.querySelector('#rcImportFile')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      let rows = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const [h, ...rest] = (await file.text()).split(/\r?\n/).filter(Boolean);
        const headers = h.split(',').map((x) => x.trim());
        rows = rest.map((line) => {
          const vals = line.split(',');
          return Object.fromEntries(headers.map((x, i) => [x, (vals[i] || '').trim()]));
        });
      } else if (window.XLSX) {
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type: 'array' });
        rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      }
      rows.forEach((r) => {
        const bin = String(r.bin || r.BIN || '').trim().toUpperCase();
        const item = String(r.item || r.ITEM || '').trim().toUpperCase();
        const qty = Number(r.qty || r.QTY || 0);
        if (bin && item) state.draft.lines.push({ bin, item, qty });
      });
      persistDraft();
      renderBins();
      root.querySelector('#rcImportTable').innerHTML = `<thead><tr><th>Lignes importées</th></tr></thead><tbody><tr><td>${rows.length}</td></tr></tbody>`;
    });

    root.querySelector('#rcPhotoInput')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await addPhoto(file);
      renderPhotos();
      toast('Photo enregistrée offline');
    });

    root.querySelector('#rcCommit')?.addEventListener('click', () => {
      if (!state.draft.container || !state.draft.asn) return toast('Container + ASN requis');
      state.history.unshift({ ...state.draft, committedAt: new Date().toISOString() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 100)));
      toast('Réception archivée');
      renderHistory();
    });

    root.querySelector('#rcExport')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state.history, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dlwms-reception-conteneur-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    root.querySelector('#rcImportHistory')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        state.history = JSON.parse(await file.text());
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
        renderHistory();
      } catch {
        toast('JSON invalide');
      }
    });

    renderBins();
    renderHistory();
    renderPhotos();
  }

  function renderBins() {
    const table = document.getElementById('rcBinsTable');
    if (!table) return;
    table.innerHTML = `<thead><tr><th>BIN</th><th>ITEM</th><th>Qté</th></tr></thead><tbody>${state.draft.lines.map((r) => `<tr><td>${r.bin}</td><td>${r.item}</td><td>${r.qty}</td></tr>`).join('')}</tbody>`;
  }

  function renderHistory() {
    const node = document.getElementById('rcHistoryList');
    if (!node) return;
    node.innerHTML = state.history.length
      ? `<ul>${state.history.map((h) => `<li><b>${h.container}</b> • ${h.asn} • ${h.lines?.length || 0} lignes</li>`).join('')}</ul>`
      : '<p class="muted">Aucune réception archivée.</p>';
  }

  async function renderPhotos() {
    const grid = document.getElementById('rcPhotosGrid');
    if (!grid) return;
    const photos = await getPhotos();
    grid.innerHTML = photos.length ? '' : '<p class="muted">Aucune photo.</p>';
    photos.forEach((p) => {
      const url = URL.createObjectURL(p.blob);
      const card = document.createElement('article');
      card.className = 'rc-photo-item';
      card.innerHTML = `<img src="${url}" alt="Réception photo" /><button type="button">${new Date(p.createdAt).toLocaleDateString('fr-CA')}</button>`;
      grid.append(card);
    });
  }

  window.DLWMS_openReceptionConteneur = () => openView('reception-conteneur', true);

  function init() {
    loadPersisted();
    mountNav();
    const initial = location.hash === '#/reception-conteneur' ? 'reception-conteneur' : 'dashboard';
    openView(initial, false);
    window.addEventListener('hashchange', () => {
      if (location.hash === '#/reception-conteneur') openView('reception-conteneur', false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
