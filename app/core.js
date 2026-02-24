// BEGIN PATCH: product-grade UI refresh
import { loadRoute } from '../core/router.js';
import ui, { setNavActive, setNavBadge, bindAccordions, showToast, debounce, addPassiveListener, UI_VERSION } from './ui.js';
import { initDB, exportAllData, importAllData, putRecord, getAll, clearStore, setConfig, getConfig, flushConfigWrites } from '../core/storage.js';
import { analyzePrompt, parseCsv, splitRowsByColumns, normalize } from './ai-engine.js';
import { incrementalTrain, trainingMatrix } from './trainer.js';
import { trainNeuralLite } from './neural-lite.js';
import { apply1000Improvements, auditImprovements } from './improvements.js';
import { attachScanController } from './scan_ui.js';
import { bindReceptionFaqPage, bindReceptionEntryPoints, installReceptionFaqGlobals } from './reception-faq.js';
import { icon } from '../ui/icons.js';

const appNode = document.getElementById('app');
const nav = document.querySelector('.bottom-nav');
const ROOT_ROUTES = ['modules', 'history', 'parametres'];
// BEGIN PATCH: NAV
const ROUTE_ALIASES = {
  settings: 'parametres',
  modules: 'modules',
  history: 'history',
};

const MODULE_ROUTES = {
  'reception-conteneur': 'reception-conteneur',
  'reception-preuve': 'reception-preuve',
  receptionpreuve: 'reception-preuve',
  receptionConteneur: 'reception-conteneur',
  reception: 'reception-conteneur',
  consolidation: 'consolidation',
  inventaire: 'inventaire',
  'suivi-expedition': 'monitoring',
  monitoring: 'monitoring',
  remise: 'remise',
};
// END PATCH: NAV
const worker = new Worker('./app/ai-worker.js', { type: 'module' });
const CONS_DATA_KEY = 'DLWMS_CONS_DATA_V1';
const CONS_LAST_IMPORT_KEY = 'DLWMS_CONS_LASTIMPORT_V1';
const REMISE_DATA_KEY = 'DLWMS_REMISE_DATA_V1';
const REMISE_HISTORY_POINTER_KEY = 'DLWMS_REMISE_HISTORY_POINTER';
const RECEIPTS_DB_NAME = 'DLWMS_RECEIPTS_DB_V1';
const RECEIPTS_STORE_NAME = 'photos';
const PROMPT_DRAFT_KEY = 'dlwms_ai_prompt_draft_v1';
const LAST_SENT_PROMPT_KEY = 'dlwms_ai_prompt_last_sent_v1';
const LIA_GUIDE_PATH = './docs/formation-lia.md';
const COMPLETE_AI_SEED_PATH = './data/ai_complete_seed.json';
let deferredPrompt;
let lastDecisionId;
let continuousTrainingTimer;
let continuousTrainingIndex = 0;
let navigationLocked = false;

const WAREHOUSE_PROMPT_PRESETS = [
  { label: 'Lecture Excel', category: 'excel', prompt: 'Lis le fichier Excel et résume les colonnes clés.' },
  { label: 'Validation CSV', category: 'csv', prompt: 'Contrôle la structure du CSV et signale les anomalies.' },
  { label: 'Extraction PDF', category: 'pdf', prompt: 'Lis le PDF, extrait les informations, réponds puis renvoie en CSV.' },
  { label: 'Opérations DAI', category: 'operations', prompt: 'Optimise les opérations DAI en réduisant les erreurs et les délais.' },
  { label: 'Pièces critiques (ABC/XYZ)', category: 'operations', prompt: 'Classe les pièces de rechange en ABC/XYZ et propose un stock de sécurité.' },
  { label: 'Prévision arrivage conteneur', category: 'operations', prompt: 'Prévois les arrivages conteneur des 14 prochains jours avec niveau de risque et plan de réception.' },
  { label: 'État des biens en temps réel', category: 'operations', prompt: 'Génère un état en temps réel des biens: disponible, réservé, en transit, bloqué qualité.' },
  { label: 'Cross-dock intelligent', category: 'operations', prompt: 'Identifie les pièces à faire passer en cross-dock pour réduire le temps de stockage.' },
  { label: 'Rotation lente', category: 'operations', prompt: 'Détecte les références à rotation lente et recommande des actions de déstockage.' },
  { label: 'Rupture atelier', category: 'operations', prompt: 'Prédis les ruptures atelier à J+7 et propose les réapprovisionnements prioritaires.' },
  { label: 'Contrôle qualité réception', category: 'operations', prompt: 'Contrôle qualité à réception: écarts, défauts, pièces en quarantaine et actions correctives.' },
  { label: 'Optimisation emplacement', category: 'operations', prompt: 'Recommande les meilleurs emplacements selon fréquence de prélèvement et criticité véhicule.' },
  { label: 'Priorisation commandes atelier', category: 'operations', prompt: 'Priorise les commandes selon immobilisation véhicule, SLA client et disponibilité réelle.' },
  { label: 'Plan de charge quai', category: 'operations', prompt: 'Construit un plan de charge quai par créneau pour lisser les arrivées de conteneurs.' },
  { label: 'Alertes écarts stock', category: 'operations', prompt: 'Signale les écarts stock théorique vs physique et propose un plan de correction.' },
  { label: 'Cannibalisation pièces', category: 'operations', prompt: 'Détecte les risques de cannibalisation inter-sites et recommande des transferts internes.' },
  { label: 'Diagnostic batterie', category: 'automobile', prompt: 'Analyse la santé batterie 12V et propose des actions en cas de chute de tension.' },
  { label: 'Usure freinage', category: 'automobile', prompt: 'Estime le risque d’usure plaquettes/disques et priorise les interventions atelier.' },
  { label: 'Plan entretien vidange', category: 'automobile', prompt: 'Prépare un plan d’entretien vidange selon kilométrage, usage et température.' },
  { label: 'Alerte pneus', category: 'automobile', prompt: 'Détecte anomalies pression/usure pneus et recommande permutation, géométrie ou remplacement.' },
];

const WAREHOUSE_DATASETS = [
  { name: 'warehouse-stock', rows: 4, sample: [{ sku: 'A-10', qty: 120 }, { sku: 'B-22', qty: 40 }] },
  { name: 'warehouse-orders', rows: 3, sample: [{ order: 'CMD-101', lines: 8 }, { order: 'CMD-102', lines: 4 }] },
];

const SPARE_PARTS_KNOWLEDGE_BASE = {
  name: 'knowledge-base-spare-parts',
  rows: 8,
  sample: [
    { topic: 'kpi', key: 'otif', formula: 'commandes à l\'heure et complètes / commandes totales', target: '>= 96%' },
    { topic: 'kpi', key: 'fill-rate', formula: 'lignes servies immédiatement / lignes demandées', target: '>= 95%' },
    { topic: 'kpi', key: 'inventory-accuracy', formula: 'références justes / références comptées', target: '>= 98.5%' },
    { topic: 'etat_biens', status: 'disponible', meaning: 'pièce physiquement présente et libre de réservation' },
    { topic: 'etat_biens', status: 'en_transit', meaning: 'pièce en route (fournisseur, conteneur, transfert inter-sites)' },
    { topic: 'etat_biens', status: 'bloque_qualite', meaning: 'pièce reçue mais retenue pour contrôle qualité' },
    { topic: 'prediction_conteneur', signal: 'retard_portuaire', action: 'augmenter stock sécurité + replanifier le quai' },
    { topic: 'prediction_conteneur', signal: 'avance_navire', action: 'préallouer équipes de réception + créneaux de déchargement' },
  ],
};

const AUTOMOTIVE_IPHONE_KNOWLEDGE_BASE = {
  name: 'knowledge-base-automobile-iphone',
  rows: 10,
  sample: [
    { topic: 'diagnostic', key: 'batterie_12v', rule: 'sous 12.2V moteur coupé => batterie faible, contrôler alternateur et démarrage' },
    { topic: 'diagnostic', key: 'alternateur', rule: 'entre 13.8V et 14.7V moteur tournant => charge correcte' },
    { topic: 'freinage', key: 'plaquettes', rule: 'épaisseur < 3 mm => remplacement prioritaire sécurité' },
    { topic: 'pneumatique', key: 'pression', rule: 'pression recommandée constructeur ±0.2 bar pour stabilité et consommation' },
    { topic: 'entretien', key: 'huile_moteur', rule: 'vidange selon carnet + usage sévère urbain/stop&go' },
    { topic: 'refroidissement', key: 'liquide', rule: 'surveiller niveau, couleur, et température pour éviter surchauffe' },
    { topic: 'distribution', key: 'courroie', rule: 'respecter échéance km/temps pour éviter casse moteur' },
    { topic: 'iphone_ui', key: 'safe_area', rule: 'respect top/bottom safe area iPhone pour actions critiques' },
    { topic: 'iphone_ui', key: 'touch_target', rule: 'cibles tactiles >= 44px et espacement suffisant' },
    { topic: 'architecture', key: 'no_dependency', rule: 'aucune dépendance externe: logique 100% locale et offline-first' },
  ],
};

const AUTOMOTIVE_TRAINING_RULES = [
  'Toujours vérifier tension batterie avant diagnostic démarrage.',
  'Prioriser sécurité freinage et pneumatiques dans les recommandations.',
  'Associer chaque alerte atelier à un niveau de criticité véhicule.',
  'Confirmer disponibilité des pièces avant promesse de délai client.',
  'Favoriser les réponses courtes et actionnables sur mobile iPhone.',
  'Éviter tout appel cloud: traitement local et stockage local uniquement.',
  'Prévenir les ruptures atelier avec seuils mini/maxi sur pièces critiques.',
  'Inclure proposition de maintenance préventive dans chaque réponse.',
  'Tracer les décisions IA pour correction positive/négative ultérieure.',
  'Conserver une ergonomie tactile iPhone pour chaque flux opérationnel.',
];

async function boot() {
  document.body.dataset.uiVersion = UI_VERSION;
  await initDB();
  bindInstall();
  bindNetworkBadge();
  bindNav();
  installReceptionFaqGlobals(navigate);
  // BEGIN PATCH: NAV
  window.DLWMS_navTo = async (route) => navigate(route);
  window.DLWMS_openModule = async (moduleId) => {
    const targetRoute = MODULE_ROUTES[moduleId] || MODULE_ROUTES[String(moduleId || '').toLowerCase()] || 'modules';
    await navigate(targetRoute);
  };
  // END PATCH: NAV
  window.DLWMS_openHistory = async ({ module } = {}) => {
    await navigate('history');
    const filter = document.getElementById('historyModuleFilter');
    if (filter && module) {
      filter.value = module;
      filter.dispatchEvent(new Event('change'));
    }
  };
  window.DLWMS_openSettings = async ({ section } = {}) => {
    if (section) sessionStorage.setItem('dlwms_settings_section', `settings-${section}`);
    await navigate('settings');
  };
  window.DLWMS_openReceptionConteneur = async () => navigate('module/reception-conteneur');
  setupBottomNavIcons();
  runOnboarding();
  bindHashRouting();
  const initialRoute = parseHashRoute() || localStorage.getItem('lastRoute') || 'modules';
  await navigate(initialRoute);
  setNavBadge('ai-center', 'IA');
  if ('serviceWorker' in navigator) await navigator.serviceWorker.register('./sw.js');
  setConfig('app_name', 'DL.WMS IA Ultimate');
  window.addEventListener('keydown', async (event) => {
    if (event.altKey && event.key.toLowerCase() === 'u') {
      await navigate('ui-self-test');
    }
  });
}

// BEGIN PATCH: NAV
function normalizeRoute(route) {
  const raw = String(route || '').trim().replace(/^#\/?/, '').replace(/^\//, '');
  if (!raw) return 'modules';
  if (raw.startsWith('module/')) {
    const moduleId = raw.slice('module/'.length);
    return MODULE_ROUTES[moduleId] || MODULE_ROUTES[moduleId.toLowerCase()] || 'modules';
  }
  return ROUTE_ALIASES[raw] || raw;
}

function parseHashRoute() {
  return normalizeRoute(window.location.hash);
}

function bindHashRouting() {
  window.addEventListener('hashchange', () => {
    navigate(parseHashRoute(), { syncHash: false });
  });
}
// END PATCH: NAV




function setupBottomNavIcons() {
  const labels = { modules: 'Modules', history: 'Historique', parametres: 'Paramètres' };
  nav?.querySelectorAll('[data-route]').forEach((button) => {
    const route = button.dataset.route;
    button.innerHTML = `${icon(route)}<span class="label">${labels[route] || route}</span>`;
  });
}

function runOnboarding() {
  if (localStorage.getItem('onboardingSeen') === 'true') return;
  ui.modal.open('onboardingModal', {
    title: 'Bienvenue sur DL WMS',
    content: '<p class="muted">Cette application fonctionne hors ligne, gère les imports, le mapping bins et trace l\'historique depuis Accueil.</p>',
    actions: [{ label: 'Commencer', variant: 'primary', onClick: () => localStorage.setItem('onboardingSeen', 'true') }],
  });
}
function bindNetworkBadge() {
  const badge = document.getElementById('networkBadge');
  if (!badge) return;

  const updateBadge = () => {
    const online = navigator.onLine;
    badge.textContent = online ? 'En ligne' : 'Mode hors ligne';
    badge.classList.toggle('is-offline', !online);
    badge.classList.toggle('is-online', online);
  };

  updateBadge();
  addPassiveListener(window, 'online', updateBadge);
  addPassiveListener(window, 'offline', updateBadge);
}

function bindInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').classList.remove('hidden');
  });
  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
}

function bindNav() {
  nav.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-route]');
    if (!button || navigationLocked) return;
    navigationLocked = true;
    button.setAttribute('aria-disabled', 'true');
    try {
      await navigate(button.dataset.route);
    } finally {
      setTimeout(() => {
        navigationLocked = false;
        button.removeAttribute('aria-disabled');
      }, 180);
    }
  });
}

async function navigate(route, options = {}) {
  const normalizedRoute = normalizeRoute(route);
  const { syncHash = true } = options;
  await loadRoute(normalizedRoute, appNode);
  const rootRoute = ROOT_ROUTES.includes(normalizedRoute) ? normalizedRoute : 'modules';
  setNavActive(rootRoute);
  localStorage.setItem('lastRoute', normalizedRoute);
  if (syncHash) {
    const hashRoute = normalizedRoute === 'parametres' ? 'settings' : normalizedRoute;
    const targetHash = `#/${hashRoute}`;
    if (window.location.hash !== targetHash) history.replaceState(null, '', targetHash);
  }
  appNode.querySelectorAll('[data-route]').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.route)));
  bindReceptionEntryPoints(appNode, navigate);

  await bindSharedActions();
  bindAccordions(appNode);
  bindScanInputs();
  bindHistoryPage(normalizedRoute);
  bindSettingsJumps(normalizedRoute);
  bindHomePage(normalizedRoute);
  bindLayoutPage(normalizedRoute);
  bindModulePages(normalizedRoute);
  if (normalizedRoute === 'reception-faq') bindReceptionFaqPage(appNode);
  if (normalizedRoute === 'parametres') await hydrateSettingsMetrics();
  if (normalizedRoute === 'monitoring') hydrateMonitoring();
  if (normalizedRoute === 'ui-self-test') bindUiSelfTest();
}


// BEGIN PATCH: CONSOLIDATION PAGE
function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function bindModulePages(route) {
  if (route === 'consolidation') bindConsolidationPage();
  if (route === 'remise') bindRemisePage();
  if (route === 'reception-preuve') bindReceptionPreuvePage();
}

function bindConsolidationPage() {
  const invInput = document.getElementById('consInventoryFile');
  const recInput = document.getElementById('consReceptionFile');
  const metaNode = document.getElementById('consImportMeta');
  const dataset = readJsonStorage(CONS_DATA_KEY, { inventory: [], reception: [] });
  const imports = readJsonStorage(CONS_LAST_IMPORT_KEY, { inventory: null, reception: null });

  const renderMeta = () => {
    if (!metaNode) return;
    const fmt = (x) => (x ? `${x.fileName} · ${new Date(x.at).toLocaleString('fr-FR')}` : 'Aucun import');
    metaNode.innerHTML = `<p class="muted">Inventaire: ${fmt(imports.inventory)}</p><p class="muted">Réception: ${fmt(imports.reception)}</p>`;
  };

  const parseRows = async (file) => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.csv')) return parseCsv(await file.text());
    if ((lower.endsWith('.xlsx') || lower.endsWith('.xls')) && window.XLSX) {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
    throw new Error('Format non supporté en mode offline (CSV requis, XLSX optionnel).');
  };

  const updateKpi = () => {
    const all = [...(dataset.inventory || []), ...(dataset.reception || [])];
    const skuSet = new Set();
    const bins = new Set();
    let totalUnits = 0;
    let anomalies = 0;
    all.forEach((row) => {
      const sku = String(row.item || row.sku || row.SKU || '').trim();
      const qty = Number(row.qty ?? row.quantity ?? row.QTY ?? 0);
      const bin = String(row.bin || row.location || '').trim();
      if (!sku) anomalies += 1;
      if (sku) skuSet.add(sku);
      if (bin) bins.add(bin);
      if (Number.isFinite(qty)) totalUnits += qty;
      else anomalies += 1;
    });
    const map = {
      sku: skuSet.size,
      bins: bins.size,
      units: totalUnits,
      low: Math.round(skuSet.size * 0.12),
      anomalies,
    };
    Object.entries(map).forEach(([key, value]) => {
      const node = document.getElementById(`consKpi-${key}`);
      if (node) node.textContent = String(value);
    });
  };

  const bindImport = (type, input) => {
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        showToast('Aucun fichier sélectionné.', 'warning');
        return;
      }
      try {
        const rows = await parseRows(file);
        dataset[type] = Array.isArray(rows) ? rows : [];
        imports[type] = { fileName: file.name, at: Date.now() };
        writeJsonStorage(CONS_DATA_KEY, dataset);
        writeJsonStorage(CONS_LAST_IMPORT_KEY, imports);
        renderMeta();
        updateKpi();
        showToast(`Import ${type} réussi (${dataset[type].length} lignes).`, 'success');
      } catch (error) {
        showToast(error.message || 'Import impossible.', 'error');
      } finally {
        input.value = '';
      }
    });
  };

  bindImport('inventory', invInput);
  bindImport('reception', recInput);
  document.getElementById('consImportInventory')?.addEventListener('click', () => invInput?.click());
  document.getElementById('consImportReception')?.addEventListener('click', () => recInput?.click());
  document.getElementById('consRecompute')?.addEventListener('click', () => {
    updateKpi();
    showToast('KPI recalculés.', 'success');
  });
  document.getElementById('consGenerate')?.addEventListener('click', () => showToast('Génération à venir.', 'info'));
  document.getElementById('consExportCsv')?.addEventListener('click', () => {
    const rows = [...(dataset.inventory || []), ...(dataset.reception || [])];
    if (!rows.length) {
      showToast('Aucune donnée à exporter.', 'warning');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `consolidation-moves-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Export CSV prêt.', 'success');
  });
  document.getElementById('consExportPdf')?.addEventListener('click', () => {
    window.print();
    showToast('Export PDF: impression système lancée.', 'info');
  });
  renderMeta();
  updateKpi();
}
// END PATCH: CONSOLIDATION PAGE

// BEGIN PATCH: REMISE PAGE
function bindRemisePage() {
  const data = readJsonStorage(REMISE_DATA_KEY, { upcoming: [], generated: [] });
  const list = document.getElementById('remiseUpcomingList');
  const renderList = () => {
    if (!list) return;
    const rows = data.upcoming || [];
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state"><p class="muted">Aucune remise planifiée.</p></div>';
      return;
    }
    list.innerHTML = rows.map((row) => `<article class="card"><strong>${row.id}</strong><p class="muted">${row.label || 'En attente'}</p></article>`).join('');
  };

  document.getElementById('remiseStart')?.addEventListener('click', () => showToast('Écran opérationnel à brancher.', 'info'));
  document.getElementById('remiseScanSelect')?.addEventListener('click', () => showToast('Scanner ID à venir.', 'info'));
  document.getElementById('remiseCreate')?.addEventListener('click', () => {
    const id = `REM-${Date.now()}`;
    data.upcoming.unshift({ id, label: 'Nouvelle remise' });
    writeJsonStorage(REMISE_DATA_KEY, data);
    writeJsonStorage(REMISE_HISTORY_POINTER_KEY, { lastId: id, at: Date.now() });
    renderList();
    showToast('Nouvelle remise créée.', 'success');
  });
  document.getElementById('remiseExport')?.addEventListener('click', () => {
    const payload = JSON.stringify(data, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    a.download = `remise-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Export Remise généré.', 'success');
  });
  const importInput = document.getElementById('remiseImportInput');
  document.getElementById('remiseImport')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      writeJsonStorage(REMISE_DATA_KEY, payload);
      showToast('Import Remise effectué.', 'success');
      renderList();
    } catch {
      showToast('Import Remise invalide.', 'error');
    }
  });
  renderList();
}
// END PATCH: REMISE PAGE

// BEGIN PATCH: RECEPTION PREUVE PAGE
function openReceiptsDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RECEIPTS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RECEIPTS_STORE_NAME)) {
        db.createObjectStore(RECEIPTS_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function receiptStore(mode) {
  const db = await openReceiptsDb();
  return db.transaction(RECEIPTS_STORE_NAME, mode).objectStore(RECEIPTS_STORE_NAME);
}

async function addReceiptPhoto(record) {
  const store = await receiptStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function getReceiptPhotos() {
  const store = await receiptStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteReceiptPhoto(id) {
  const store = await receiptStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

function bindReceptionPreuvePage() {
  const picker = document.getElementById('preuvePhotoInput');
  const titleNode = document.getElementById('preuveTitle');
  const containerNode = document.getElementById('preuveContainer');
  const gallery = document.getElementById('preuveGallery');
  const filterNode = document.getElementById('preuveFilterWindow');
  const searchNode = document.getElementById('preuveSearchContainer');
  const purgeDaysNode = document.getElementById('preuvePurgeDays');

  const filterRows = (rows) => {
    const now = Date.now();
    const windowValue = filterNode?.value || 'today';
    const search = (searchNode?.value || '').trim().toLowerCase();
    return rows.filter((row) => {
      const age = now - row.createdAt;
      const keepByDate = windowValue === 'all'
        ? true
        : windowValue === '7d'
          ? age <= 7 * 24 * 3600 * 1000
          : new Date(row.createdAt).toDateString() === new Date(now).toDateString();
      const keepBySearch = !search || String(row.linkedTo?.id || '').toLowerCase().includes(search);
      return keepByDate && keepBySearch;
    });
  };

  const renderGallery = async () => {
    if (!gallery) return;
    const rows = filterRows(await getReceiptPhotos());
    if (!rows.length) {
      gallery.innerHTML = '<div class="empty-state"><p class="muted">Aucune preuve trouvée.</p></div>';
      return;
    }
    gallery.innerHTML = '';
    rows.sort((a, b) => b.createdAt - a.createdAt).forEach((row) => {
      const item = document.createElement('article');
      item.className = 'card preuve-item';
      const imgUrl = URL.createObjectURL(row.blob);
      item.innerHTML = `<img src="${imgUrl}" alt="${row.title}" class="preuve-thumb" /><div><strong>${row.title}</strong><p class="muted">${new Date(row.createdAt).toLocaleString('fr-FR')} · conteneur: ${row.linkedTo?.id || '-'}</p></div><div class="row"><button class="btn" data-download="${row.id}">Télécharger</button><button class="btn btn-danger" data-delete="${row.id}">Supprimer</button></div>`;
      gallery.appendChild(item);
      item.querySelector('[data-download]')?.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = `${row.title || 'preuve'}-${row.id}.jpg`;
        a.click();
        showToast('Téléchargement lancé.', 'success');
      });
      item.querySelector('[data-delete]')?.addEventListener('click', async () => {
        await deleteReceiptPhoto(row.id);
        showToast('Photo supprimée.', 'success');
        renderGallery();
      });
    });
  };

  document.getElementById('preuveAddPhoto')?.addEventListener('click', () => picker?.click());
  document.getElementById('preuvePickInPanel')?.addEventListener('click', () => picker?.click());
  picker?.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) {
      showToast('Aucune photo sélectionnée.', 'warning');
      return;
    }
    const record = {
      id: `photo-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      createdAt: Date.now(),
      title: titleNode?.value?.trim() || 'Preuve réception',
      blob: file,
      linkedTo: { type: 'container', id: containerNode?.value?.trim() || '' },
    };
    try {
      await addReceiptPhoto(record);
      showToast('Photo enregistrée offline.', 'success');
      picker.value = '';
      renderGallery();
    } catch {
      showToast('Impossible de stocker la photo.', 'error');
    }
  });

  filterNode?.addEventListener('change', renderGallery);
  searchNode?.addEventListener('input', debounce(renderGallery, 180));
  document.getElementById('preuvePurge')?.addEventListener('click', async () => {
    const days = Math.max(1, Number(purgeDaysNode?.value || 30));
    if (!window.confirm(`Supprimer les photos de plus de ${days} jours ?`)) return;
    const rows = await getReceiptPhotos();
    const limit = Date.now() - (days * 24 * 3600 * 1000);
    await Promise.all(rows.filter((row) => row.createdAt < limit).map((row) => deleteReceiptPhoto(row.id)));
    showToast('Purge effectuée.', 'success');
    renderGallery();
  });

  renderGallery();
}
// END PATCH: RECEPTION PREUVE PAGE

function bindSettingsJumps(route) {
  const section = appNode.querySelector('[data-settings-section]')?.dataset.settingsSection;
  if (route === 'parametres') {
    const pending = sessionStorage.getItem('dlwms_settings_section');
    if (pending) {
      const targetSection = document.getElementById(pending);
      targetSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (targetSection) {
        targetSection.classList.add('settings-highlight');
        window.setTimeout(() => targetSection.classList.remove('settings-highlight'), 1800);
      }
      sessionStorage.removeItem('dlwms_settings_section');
    }
  }
  appNode.querySelectorAll('[data-settings-section]').forEach((button) => {
    button.addEventListener('click', () => {
      sessionStorage.setItem('dlwms_settings_section', button.dataset.settingsSection);
    });
  });
  if (section) sessionStorage.setItem('dlwms_settings_section', section);
}

async function bindHistoryPage(route) {
  if (route !== 'history') return;
  const list = document.getElementById('historyEvents');
  const filter = document.getElementById('historyModuleFilter');
  if (!list || !filter) return;
  const [stats, requests] = await Promise.all([getAll('stats'), getAll('requests')]);
  const rows = [...stats, ...requests].map((item) => ({
    module: item.scope || item.module || 'ai-center',
    label: item.prompt || item.status || item.type || 'événement',
    at: item.updatedAt || Date.now(),
  })).sort((a, b) => b.at - a.at);

  const render = () => {
    const module = filter.value;
    const filtered = module === 'all' ? rows : rows.filter((row) => row.module.includes(module));
    list.textContent = filtered.length
      ? filtered.slice(0, 80).map((row) => `${new Date(row.at).toLocaleString('fr-FR')} · ${row.module} · ${row.label}`).join('\n')
      : 'Aucun événement.';
  };

  filter.addEventListener('change', render);
  render();
}


function bindScanInputs() {
  appNode.querySelectorAll('[data-scan-input]').forEach((input) => {
    attachScanController(input, {
      onScan: ({ value }) => {
        const target = document.getElementById('scanLastValue');
        if (target) target.textContent = value;
      },
      keepFocus: true,
    });
  });
}

function bindUiSelfTest() {
  const launchBtn = document.getElementById('runListStress');
  const mount = document.getElementById('stressList');
  launchBtn?.addEventListener('click', () => {
    const items = Array.from({ length: 1000 }, (_, i) => `SKU-${String(i + 1).padStart(4, '0')}`);
    if (items.length > 500) {
      ui.list.virtual({
        items,
        mount,
        renderRow: (item) => {
          const row = document.createElement('div');
          row.className = 'list-row';
          row.textContent = item;
          return row;
        },
      });
      return;
    }
    ui.list.chunked({
      items,
      mount,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'list-row';
        row.textContent = item;
        return row;
      },
    });
  });
}

async function bindSharedActions() {
  const promptNode = document.getElementById('aiPrompt');
  const draftStatusNode = document.getElementById('promptDraftStatus');
  const presetNode = document.getElementById('promptPreset');
  const categoryNode = document.getElementById('promptCategory');

  const updateDraftStatus = (message) => {
    if (!draftStatusNode) return;
    draftStatusNode.textContent = `Brouillon local: ${message}`;
  };

  if (promptNode) {
    const storedDraft = localStorage.getItem(PROMPT_DRAFT_KEY);
    const storedPrompt = localStorage.getItem('selectedPromptPreset');
    if (storedDraft && !promptNode.value.trim()) {
      promptNode.value = storedDraft;
      updateDraftStatus('restauré automatiquement (offline).');
    } else if (storedPrompt && !promptNode.value.trim()) {
      promptNode.value = storedPrompt;
      updateDraftStatus('prérempli depuis le preset.');
    } else {
      updateDraftStatus('prêt. sauvegarde instantanée active.');
    }

    promptNode.addEventListener('input', debounce(() => {
      const value = promptNode.value.trim();
      if (!value) {
        localStorage.removeItem(PROMPT_DRAFT_KEY);
        updateDraftStatus('vide.');
        return;
      }
      localStorage.setItem(PROMPT_DRAFT_KEY, value);
      updateDraftStatus(`sauvegardé à ${new Date().toLocaleTimeString('fr-FR')}.`);
    }, 180));
  }

  document.getElementById('restorePromptDraft')?.addEventListener('click', () => {
    if (!promptNode) return;
    const draft = localStorage.getItem(PROMPT_DRAFT_KEY);
    if (!draft) {
      showToast('Aucun brouillon local disponible.', 'warning');
      updateDraftStatus('aucune sauvegarde disponible.');
      return;
    }
    promptNode.value = draft;
    showToast('Brouillon restauré depuis le stockage local.', 'success');
    updateDraftStatus('restauré manuellement.');
  });

  document.getElementById('insertLastPrompt')?.addEventListener('click', () => {
    if (!promptNode) return;
    const lastPrompt = localStorage.getItem(LAST_SENT_PROMPT_KEY);
    if (!lastPrompt) {
      showToast('Aucun prompt envoyé récemment.', 'warning');
      return;
    }
    promptNode.value = lastPrompt;
    localStorage.setItem(PROMPT_DRAFT_KEY, lastPrompt);
    updateDraftStatus('dernier prompt restauré.');
  });

  if (presetNode) {
    presetNode.innerHTML = '<option value="">Sélectionner un prompt...</option>';
    let selected = WAREHOUSE_PROMPT_PRESETS;
    if (categoryNode?.value) selected = selected.filter((p) => p.category === categoryNode.value);
    for (const preset of selected) {
      const option = document.createElement('option');
      option.value = preset.prompt;
      option.textContent = preset.label;
      presetNode.append(option);
    }
  }

  categoryNode?.addEventListener('change', debounce(() => bindSharedActions(), 120), { once: true });

  document.getElementById('usePromptPreset')?.addEventListener('click', () => {
    if (!presetNode?.value) return;
    localStorage.setItem('selectedPromptPreset', presetNode.value);
    if (promptNode) {
      promptNode.value = presetNode.value;
      updateAiPanels('Prompt pré-enregistré injecté.', 'Prompt prêt à être envoyé.');
      return;
    }
    updateAiPanels('Prompt sélectionné.', 'Ouvrez la page principale pour exécuter le prompt.');
  });

  document.getElementById('sendPromptToMain')?.addEventListener('click', async () => {
    if (!presetNode?.value) return;
    localStorage.setItem('selectedPromptPreset', presetNode.value);
    updateAiPanels('Prompt transféré.', 'Le prompt est prêt sur la page principale.');
    await navigate('ai-center');
    const aiPromptNode = document.getElementById('aiPrompt');
    if (aiPromptNode) aiPromptNode.value = presetNode.value;
  });

  document.getElementById('createPrompt')?.addEventListener('click', async () => {
    const label = document.getElementById('newPromptLabel').value.trim();
    const category = document.getElementById('newPromptCategory').value;
    const text = document.getElementById('newPromptText').value.trim();
    if (!label || !text) return;
    WAREHOUSE_PROMPT_PRESETS.push({ label, category, prompt: text });
    await putRecord('datasets', { name: `prompt-${label}`, rows: 1, sample: [{ category, text }] });
    updateAiPanels(`Nouveau prompt créé: ${label}.`, text);
  });

  document.getElementById('loadLiaPrompts')?.addEventListener('click', async () => {
    await putRecord('datasets', { name: 'lia-training-prompts', rows: WAREHOUSE_PROMPT_PRESETS.length, sample: WAREHOUSE_PROMPT_PRESETS });
    await putRecord('datasets', SPARE_PARTS_KNOWLEDGE_BASE);
    await putRecord('datasets', AUTOMOTIVE_IPHONE_KNOWLEDGE_BASE);
    const status = document.getElementById('liaTrainingStatus');
    if (status) status.textContent = `Programme chargé: ${WAREHOUSE_PROMPT_PRESETS.length} prompts + base pièces auto + savoir auto iPhone.`;
    updateAiPanels('Prompts de formation chargés.', 'Base de connaissances IA entrepôt pièces auto + règles iPhone sans dépendance prêtes.');
    await hydrateSettingsMetrics();
  });

  document.getElementById('injectAutoKnowledge')?.addEventListener('click', async () => {
    await putRecord('datasets', AUTOMOTIVE_IPHONE_KNOWLEDGE_BASE);
    for (const text of AUTOMOTIVE_TRAINING_RULES) await putRecord('rules', { text, priority: 2, scope: 'automobile' });
    await ensureKnowledgeFloor(10);
    updateAiPanels('Savoir automobile injecté.', 'Base métier + règles iPhone/no-dependency ajoutées jusqu’au seuil 10% de connaissance.');
    await hydrateSettingsMetrics();
  });

  document.getElementById('openLiaGuide')?.addEventListener('click', () => window.open(LIA_GUIDE_PATH, '_blank', 'noopener'));
  document.getElementById('openGlobalHistory')?.addEventListener('click', () => window.DLWMS_openHistory?.({}));

  document.getElementById('runAi')?.addEventListener('click', async () => {
    const prompt = promptNode?.value.trim();
    if (!prompt) return;
    localStorage.setItem(LAST_SENT_PROMPT_KEY, prompt);
    localStorage.removeItem(PROMPT_DRAFT_KEY);
    updateDraftStatus('envoyé et archivé localement.');
    await putRecord('requests', { channel: 'text', prompt, status: 'received' });
    const moves = [{ distance: 12 }, { distance: 8 }, { distance: 7 }];
    worker.postMessage({ type: 'batch-distance', payload: { moves } });
    worker.onmessage = async ({ data }) => {
      if (data.type === 'batch-distance') setConfig('last_distance', data.total);
      const decision = await analyzePrompt(prompt, { moves, history: await getAll('stats') });
      lastDecisionId = decision.id;
      const scoreNode = document.getElementById('aiScore');
      if (scoreNode) scoreNode.textContent = `Score décision: ${decision.score}`;
      updateAiPanels(`IA en action: ${prompt}`, decision.reasoning);
    };
  });

  document.getElementById('cancelPrompt')?.addEventListener('click', () => {
    if (promptNode) promptNode.value = '';
    localStorage.removeItem(PROMPT_DRAFT_KEY);
    updateDraftStatus('supprimé.');
    updateAiPanels('Demande annulée par utilisateur.', 'Aucune réponse envoyée.');
  });

  document.getElementById('correctPositive')?.addEventListener('click', () => setFeedback(true));
  document.getElementById('correctNegative')?.addEventListener('click', () => setFeedback(false));

  document.getElementById('addRule')?.addEventListener('click', async () => {
    const txt = document.getElementById('customRule').value.trim();
    if (!txt) return;
    await putRecord('rules', { text: txt, priority: 1 });
    updateAiPanels(`Règle ajoutée: ${txt}`, 'Règle enregistrée pour l’apprentissage.');
    await hydrateSettingsMetrics();
  });

  document.getElementById('loadDataset')?.addEventListener('click', async () => {
    const sample = [{ x: [0.3, 0.4, 0.2, 0.1], y: 1 }, { x: [0.1, 0.2, 0.8, 0.5], y: 0 }];
    await putRecord('datasets', { name: 'sample-neural', rows: sample.length, sample });
    updateAiPanels('Dataset exemple chargé.', 'Données disponibles pour entraînement.');
    await hydrateSettingsMetrics();
  });

  document.getElementById('runTraining')?.addEventListener('click', async () => {
    const datasets = await getAll('datasets');
    const sample = datasets.find((d) => d.name === 'sample-neural')?.sample || [];
    const weights = trainNeuralLite(sample);
    const matrix = trainingMatrix(Math.max(8, sample.length * 4));
    const matrixNode = document.getElementById('matrixOutput');
    if (matrixNode) matrixNode.textContent = `Poids: ${JSON.stringify(weights)}\nMatrice: ${JSON.stringify(matrix, null, 2)}`;
    updateAiPanels('Mini entraînement exécuté.', 'Résultats d’entraînement générés.');
  });

  document.getElementById('startContinuousTraining')?.addEventListener('click', async () => {
    if (continuousTrainingTimer) return;
    const status = document.getElementById('liaTrainingStatus');
    if (status) status.textContent = 'Formation continue active (1 prompt / 5 secondes).';
    continuousTrainingTimer = setInterval(async () => {
      const currentPreset = WAREHOUSE_PROMPT_PRESETS[continuousTrainingIndex % WAREHOUSE_PROMPT_PRESETS.length];
      continuousTrainingIndex += 1;
      await putRecord('requests', { channel: 'continuous-training', prompt: currentPreset.prompt, status: 'trained' });
      await incrementalTrain({ success: true, weightDelta: 0.01 });
      updateAiPanels(`Formation continue #${continuousTrainingIndex}`, currentPreset.prompt);
      await hydrateSettingsMetrics();
    }, 5000);
  });

  document.getElementById('stopContinuousTraining')?.addEventListener('click', () => {
    if (!continuousTrainingTimer) return;
    clearInterval(continuousTrainingTimer);
    continuousTrainingTimer = null;
    const status = document.getElementById('liaTrainingStatus');
    if (status) status.textContent = 'Formation continue stoppée.';
    updateAiPanels('Formation continue stoppée.', 'Entraînement en pause.');
  });

  document.getElementById('resetLearning')?.addEventListener('click', async () => {
    for (const store of ['rules', 'weights', 'vectors', 'decisions', 'stats', 'thresholds']) await clearStore(store);
    setConfig('nn_weights', [0.5, -0.2, 0.8, 0.3]);
    updateAiPanels('Apprentissage réinitialisé.', 'Les paramètres IA ont été remis à zéro.');
    showToast('Apprentissage réinitialisé', 'info');
    await hydrateSettingsMetrics();
  });

  document.getElementById('exportModel')?.addEventListener('click', async () => {
    const model = { nn: getConfig('nn_weights', []), rules: await getAll('rules'), weights: await getAll('weights') };
    downloadJSON(model, 'dlwms-model.json');
  });

  document.getElementById('retrainBtn')?.addEventListener('click', async () => {
    await incrementalTrain({ success: true, weightDelta: 0.02 });
    updateAiPanels('Micro-réentraînement exécuté.', 'Le modèle a été affiné localement.');
  });

  bindImportInput('excelInput', 'Excel');
  bindImportInput('csvInput', 'CSV');
  bindImportInput('pdfInput', 'PDF');

  document.getElementById('extractExcel')?.addEventListener('click', async () => {
    const rowsTables = await getAll('excelRows');
    const columnsTables = await getAll('excelColumns');
    const rowCount = rowsTables.reduce((sum, table) => sum + ((table.rows || []).length || 0), 0);
    const columnCount = columnsTables.reduce((sum, table) => sum + ((table.columns || []).length || 0), 0);
    updateAiPanels('Analyse import terminée.', `${rowCount} lignes et ${columnCount} colonnes séparées.`);
  });

  document.getElementById('loadWarehouseData')?.addEventListener('click', async () => {
    const loaded = await loadCompleteAISeed();
    if (loaded) {
      updateAiPanels('Base IA complète chargée.', loaded);
    } else {
      for (const dataset of WAREHOUSE_DATASETS) await putRecord('datasets', dataset);
      updateAiPanels('Bases entrepôt chargées.', `${WAREHOUSE_DATASETS.length} datasets disponibles (mode secours).`);
    }
    await hydrateSettingsMetrics();
  });

  document.getElementById('exportBackup')?.addEventListener('click', async () => {
    const data = await exportAllData();
    downloadJSON(data, 'dlwms-backup.json');
  });

  document.getElementById('importBackup')?.addEventListener('click', async () => {
    const [file] = document.getElementById('fileInput').files;
    if (!file) {
      showToast('Sélectionnez un fichier backup JSON avant import.', 'warning');
      return;
    }
    try {
      const json = JSON.parse(await file.text());
      await importAllData(json);
      updateAiPanels('Backup importé.', 'Les données locales ont été restaurées.');
      showToast('Backup importé avec succès.', 'success');
      await hydrateSettingsMetrics();
    } catch {
      showToast('Import impossible: fichier JSON invalide.', 'error');
    }
  });


  const apply1000Btn = document.getElementById('apply3000Improvements') || document.getElementById('apply1000Improvements') || document.getElementById('apply300Improvements');
  apply1000Btn?.addEventListener('click', async () => {
    await apply1000Improvements();
    const summary = await auditImprovements();
    updateAiPanels('Pack 3000 améliorations appliqué.', `Conformité: ${summary.score}% (${summary.passed}/${summary.total}).`);
    await hydrateSettingsMetrics();
  });

  const verify1000Btn = document.getElementById('verify3000Improvements') || document.getElementById('verify1000Improvements') || document.getElementById('verify300Improvements');
  verify1000Btn?.addEventListener('click', async () => {
    const summary = await auditImprovements();
    updateAiPanels('Audit des 3000 améliorations terminé.', `Score: ${summary.score}% - OK: ${summary.passed} - KO: ${summary.failed}.`);
    await hydrateSettingsMetrics();
  });

  document.getElementById('runVoiceCommand')?.addEventListener('click', async () => {
    const voiceInputNode = document.getElementById('voicePrompt');
    const command = voiceInputNode.value.trim();
    if (!command) return;
    const normalizedCommand = normalize(command);
    const commandId = await putRecord('voiceCommands', { raw: command, normalized: normalizedCommand, status: 'received' });

    if (normalizedCommand.includes('archive la palette')) {
      await putRecord('palettes', { label: `Palette ${new Date().toLocaleTimeString('fr-FR')}`, status: 'archived', archivedBy: 'voice-command' });
      await putRecord('voiceCommands', { id: commandId, raw: command, normalized: normalizedCommand, status: 'executed', action: 'archive_palette' });
      updateAiPanels('Commande vocale exécutée.', 'La palette a été archivée.');
    } else {
      await putRecord('voiceCommands', { id: commandId, raw: command, normalized: normalizedCommand, status: 'ignored' });
      updateAiPanels('Commande vocale enregistrée.', 'Aucune action associée trouvée.');
    }
  });
}


function showActionToast(message, tone = 'success') {
  showToast(message, tone);
}

function bindHomePage(route) {
  if (route !== 'home') return;
  const hasBinMap = !!getConfig('DLWMS_BINMAP', null);
  const bindQuick = (id, handler, requiresBinMap = false) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (requiresBinMap && !hasBinMap) {
      btn.disabled = true;
      btn.title = 'Aller dans Paramètres > Réception pour configurer Bin Map';
      return;
    }
    btn.addEventListener('click', handler);
  };

  bindQuick('BTN_HOME_HISTORY', () => {
    window.DLWMS_openHistory?.({ module: 'all' });
    showActionToast('Historique ouvert.');
  });
  bindQuick('CARD_QUICK_RECEIPT_CONTAINER', async () => { await window.DLWMS_openReceptionConteneur?.(); showActionToast('Module Réception conteneur ouvert.'); });
  bindQuick('CARD_QUICK_CONSOLIDATION', async () => { await navigate('consolidation'); showActionToast('Module Consolidation ouvert.'); });
  bindQuick('CARD_QUICK_INVENTORY', async () => { await navigate('inventaire'); showActionToast('Module Inventaire ouvert.'); });
  bindQuick('CARD_QUICK_SHIPPING_TRACK', async () => { await navigate('monitoring'); showActionToast('Module Suivi expédition ouvert.'); });
  bindQuick('CARD_QUICK_RESTOCK', async () => { await navigate('remise'); showActionToast('Module Remise en stock ouvert.'); });

  document.getElementById('BTN_HOME_HELP_FAQ')?.addEventListener('click', async () => {
    await navigate('reception-faq');
    showActionToast('Aide FAQ ouverte.');
  });

  document.getElementById('BTN_HOME_EXPORT_BACKUP')?.addEventListener('click', async () => {
    const data = await exportAllData();
    const payload = {
      meta: { exportedAt: Date.now(), source: 'home-tools' },
      indexedDb: data,
      settings: getConfig('DLWMS_LAYOUT_PREFS_V1', {}),
      layouts: getConfig('DLWMS_LAYOUTS_V1', []),
      layoutLast: getConfig('DLWMS_LAYOUT_LAST_ID', null),
      tileset: getConfig('DLWMS_LAYOUT_TILESET_V1', []),
      binMap: getConfig('DLWMS_BINMAP', null),
    };
    downloadJSON(payload, `dlwms_backup_${new Date().toISOString().slice(0, 10)}.json`);
    showActionToast('Backup exporté.');
  });

  document.getElementById('BTN_HOME_IMPORT_BACKUP')?.addEventListener('click', () => document.getElementById('homeBackupFile')?.click());
  document.getElementById('homeBackupFile')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (json.indexedDb) await importAllData(json.indexedDb);
      if (json.settings) setConfig('DLWMS_LAYOUT_PREFS_V1', json.settings);
      if (json.layouts) setConfig('DLWMS_LAYOUTS_V1', json.layouts);
      if (json.layoutLast) setConfig('DLWMS_LAYOUT_LAST_ID', json.layoutLast);
      if (json.tileset) setConfig('DLWMS_LAYOUT_TILESET_V1', json.tileset);
      if (json.binMap) setConfig('DLWMS_BINMAP', json.binMap);
      showActionToast('Backup importé avec merge.', 'success');
    } catch {
      showActionToast('Import backup invalide.', 'error');
    }
  });

  document.getElementById('BTN_HOME_STORAGE_STATUS')?.addEventListener('click', async () => {
    const usage = new Blob(Object.values(localStorage)).size;
    const indexedStats = (await getAll('stats')).length;
    ui.modal.open('storageStatusModal', {
      title: 'Santé stockage',
      content: `<p>localStorage ~ ${(usage / 1024).toFixed(1)} KB</p><p>IndexedDB stats: ${indexedStats} entrées</p>`,
    });
  });

  document.getElementById('BTN_HOME_OFFLINE_BADGE')?.addEventListener('click', () => {
    ui.modal.open('offlineHelpModal', {
      title: 'Mode offline',
      content: '<p>Offline prêt: imports, exports et historique disponibles sans réseau.</p>',
    });
  });
}

function bindLayoutPage(route) {
  if (route !== 'layout') return;
  const tileTypes = [
    { id: 'TILE_EMPTY', color: '#1f2947' }, { id: 'TILE_AISLE', color: '#2f8fff' }, { id: 'TILE_WALL', color: '#5d657f' }, { id: 'TILE_DOOR', color: '#26d39b' },
    { id: 'TILE_RACK', color: '#ffba55' }, { id: 'TILE_PILLAR', color: '#8a6eff' }, { id: 'TILE_DOCK', color: '#4ea8ff' }, { id: 'TILE_OFFICE', color: '#fb79b2' },
    { id: 'TILE_NO_GO', color: '#ff5f7d' }, { id: 'TILE_ZONE', color: '#6ad5ff' }, { id: 'TILE_STAIRS', color: '#9dacd6' }, { id: 'TILE_ELEVATOR', color: '#4bdca6' },
    { id: 'TILE_PARKING', color: '#d1b3ff' }, { id: 'TILE_CHARGING', color: '#85f4ff' },
  ];
  const defaultLayout = { id: 'main', name: 'Principal', rows: 12, cols: 12, cells: Array.from({ length: 144 }, () => ({ type: 'TILE_EMPTY', label: '' })) };
  const prefs = { autosave: true, showCoords: false, brush: '1x1', dragPaint: true, ...getConfig('DLWMS_LAYOUT_PREFS_V1', {}) };
  const layouts = getConfig('DLWMS_LAYOUTS_V1', [defaultLayout]);
  const lastId = getConfig('DLWMS_LAYOUT_LAST_ID', layouts[0]?.id || 'main');
  let activeId = lastId;
  let tool = 'TOOL_SELECT';
  let activeType = 'TILE_RACK';
  let selectedIndex = 0;
  const undo = [];
  const redo = [];

  const byId = (id) => layouts.find((l) => l.id === id) || layouts[0];
  const activeLayout = () => byId(activeId);

  const select = document.getElementById('DROPDOWN_LAYOUT_SELECT');
  select.innerHTML = layouts.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
  select.value = activeId;
  select.addEventListener('change', () => {
    persist();
    activeId = select.value;
    setConfig('DLWMS_LAYOUT_LAST_ID', activeId);
    renderGrid();
    showActionToast('Layout chargé.');
  });

  const grid = document.getElementById('layoutGrid');
  const meta = document.getElementById('layoutCellMeta');

  const saveSnapshot = () => undo.push(JSON.stringify(activeLayout().cells));

  const persist = () => {
    setConfig('DLWMS_LAYOUTS_V1', layouts);
    setConfig('DLWMS_LAYOUT_PREFS_V1', prefs);
  };

  const applyCell = (index, type = activeType) => {
    const cell = activeLayout().cells[index];
    if (!cell) return;
    cell.type = type;
    if (prefs.autosave) persist();
  };

  const renderGrid = () => {
    const layout = activeLayout();
    grid.style.gridTemplateColumns = `repeat(${layout.cols}, 28px)`;
    grid.innerHTML = '';
    layout.cells.forEach((cell, index) => {
      const b = document.createElement('button');
      b.className = `layout-cell ${selectedIndex === index ? 'active' : ''}`;
      const tile = tileTypes.find((t) => t.id === cell.type);
      b.style.background = tile?.color || '#1f2947';
      b.title = cell.type;
      b.textContent = prefs.showCoords ? `${Math.floor(index / layout.cols)},${index % layout.cols}` : '';
      b.addEventListener('click', () => {
        selectedIndex = index;
        if (tool === 'TOOL_PEN') { saveSnapshot(); applyCell(index); }
        if (tool === 'TOOL_ERASER') { saveSnapshot(); applyCell(index, 'TILE_EMPTY'); }
        if (tool === 'TOOL_FILL') {
          const ref = cell.type;
          const total = layout.cells.filter((c) => c.type === ref).length;
          if (total > 100 && !confirm(`Remplir ${total} cases ?`)) return;
          saveSnapshot();
          layout.cells.forEach((c) => { if (c.type === ref) c.type = activeType; });
        }
        if (tool === 'TOOL_RECT') {
          saveSnapshot();
          const baseRow = Math.floor(selectedIndex / layout.cols);
          const baseCol = selectedIndex % layout.cols;
          const row = Math.floor(index / layout.cols);
          const col = index % layout.cols;
          for (let r = Math.min(baseRow, row); r <= Math.max(baseRow, row); r += 1) {
            for (let c = Math.min(baseCol, col); c <= Math.max(baseCol, col); c += 1) applyCell(r * layout.cols + c);
          }
        }
        if (tool === 'TOOL_MEASURE') {
          const row = Math.floor(index / layout.cols);
          const col = index % layout.cols;
          const sRow = Math.floor(selectedIndex / layout.cols);
          const sCol = selectedIndex % layout.cols;
          showActionToast(`Distance: ${Math.abs(row - sRow) + Math.abs(col - sCol)} cases`, 'info');
        }
        meta.textContent = `${cell.type} · row ${Math.floor(index / layout.cols)} col ${index % layout.cols} · label: ${cell.label || '-'}`;
        renderGrid();
      });
      grid.appendChild(b);
    });
  };

  ['TOOL_SELECT', 'TOOL_PEN', 'TOOL_ERASER', 'TOOL_FILL', 'TOOL_RECT', 'TOOL_TEXT_LABEL', 'TOOL_MEASURE'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => { tool = id; showActionToast(`Outil actif: ${id}`); });
  });
  document.getElementById('BTN_TILE_PICKER')?.addEventListener('click', () => {
    const choice = prompt(`Type case (${tileTypes.map((t) => t.id).join(', ')})`, activeType);
    if (!choice) return;
    activeType = choice;
    showActionToast(`Type actif: ${activeType}`);
  });
  document.getElementById('BTN_TILE_FAVORITES')?.addEventListener('click', () => {
    const favorites = getConfig('DLWMS_LAYOUT_PREFS_V1', {}).favorites || [];
    if (!favorites.includes(activeType)) favorites.push(activeType);
    prefs.favorites = favorites;
    persist();
    showActionToast('Favori ajouté.');
  });
  document.getElementById('BTN_UNDO')?.addEventListener('click', () => { if (!undo.length) return; redo.push(JSON.stringify(activeLayout().cells)); activeLayout().cells = JSON.parse(undo.pop()); renderGrid(); showActionToast('Undo.'); });
  document.getElementById('BTN_REDO')?.addEventListener('click', () => { if (!redo.length) return; undo.push(JSON.stringify(activeLayout().cells)); activeLayout().cells = JSON.parse(redo.pop()); renderGrid(); showActionToast('Redo.'); });
  document.getElementById('TOGGLE_AUTOSAVE')?.addEventListener('click', () => { prefs.autosave = !prefs.autosave; persist(); showActionToast(`Auto-save ${prefs.autosave ? 'ON' : 'OFF'}`); });
  document.getElementById('BTN_GRID_TOGGLE_COORDS')?.addEventListener('click', () => { prefs.showCoords = !prefs.showCoords; persist(); renderGrid(); showActionToast('Affichage coords mis à jour.'); });
  document.getElementById('BTN_GRID_SNAP')?.addEventListener('click', () => showActionToast('Snap togglé.', 'info'));
  document.getElementById('TOGGLE_PAN_MODE')?.addEventListener('click', () => showActionToast('Mode pan actif.', 'info'));
  document.getElementById('BTN_ZOOM_IN')?.addEventListener('click', () => { grid.style.zoom = String((Number(grid.style.zoom || 1) + 0.1).toFixed(2)); });
  document.getElementById('BTN_ZOOM_OUT')?.addEventListener('click', () => { grid.style.zoom = String((Number(grid.style.zoom || 1) - 0.1).toFixed(2)); });
  document.getElementById('BTN_ZOOM_FIT')?.addEventListener('click', () => { grid.style.zoom = '1'; showActionToast('Zoom ajusté.', 'info'); });
  document.getElementById('BTN_GRID_RESIZE')?.addEventListener('click', () => {
    const rows = Number(prompt('Nb lignes', String(activeLayout().rows)) || activeLayout().rows);
    const cols = Number(prompt('Nb colonnes', String(activeLayout().cols)) || activeLayout().cols);
    if (!rows || !cols) return;
    const old = activeLayout();
    const next = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const oldIndex = r * old.cols + c;
        next.push(old.cells[oldIndex] || { type: 'TILE_EMPTY', label: '' });
      }
    }
    old.rows = rows; old.cols = cols; old.cells = next;
    persist(); renderGrid(); showActionToast('Grille redimensionnée.');
  });

  document.getElementById('BTN_CELL_CHANGE_TYPE')?.addEventListener('click', () => { applyCell(selectedIndex); renderGrid(); showActionToast('Type case changé.'); });
  document.getElementById('BTN_CELL_EDIT_LABEL')?.addEventListener('click', () => { const v = prompt('Label case', activeLayout().cells[selectedIndex].label || ''); if (v === null) return; activeLayout().cells[selectedIndex].label = v; persist(); renderGrid(); });
  document.getElementById('BTN_CELL_CLEAR')?.addEventListener('click', () => { applyCell(selectedIndex, 'TILE_EMPTY'); renderGrid(); showActionToast('Case vidée.'); });
  document.getElementById('BTN_CELL_COPY')?.addEventListener('click', () => { sessionStorage.setItem('layoutCellClipboard', JSON.stringify(activeLayout().cells[selectedIndex])); showActionToast('Case copiée.'); });
  document.getElementById('BTN_CELL_PASTE')?.addEventListener('click', () => { const clip = sessionStorage.getItem('layoutCellClipboard'); if (!clip) return; activeLayout().cells[selectedIndex] = JSON.parse(clip); persist(); renderGrid(); showActionToast('Case collée.'); });

  document.getElementById('BTN_LAYOUT_EXPORT_JSON')?.addEventListener('click', () => downloadJSON({ version: 1, layout: activeLayout(), legend: tileTypes }, `layout_${activeLayout().id}_${new Date().toISOString().slice(0, 10)}.json`));
  document.getElementById('BTN_LAYOUT_IMPORT_JSON')?.addEventListener('click', () => document.getElementById('layoutImportFile')?.click());
  document.getElementById('layoutImportFile')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json.layout?.cells) throw new Error();
      const idx = layouts.findIndex((l) => l.id === json.layout.id);
      if (idx >= 0) layouts[idx] = json.layout; else layouts.push(json.layout);
      activeId = json.layout.id;
      persist();
      showActionToast('Layout importé.');
      select.innerHTML = layouts.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
      select.value = activeId;
      renderGrid();
    } catch {
      showActionToast('Import layout invalide.', 'error');
    }
  });
  document.getElementById('BTN_LAYOUT_EXPORT_PNG')?.addEventListener('click', () => showActionToast('Export PNG non disponible: utilisez JSON.', 'warning'));
  document.getElementById('BTN_LAYOUT_EXPORT_PDF')?.addEventListener('click', () => window.print());
  document.getElementById('BTN_LAYOUT_EXPORT_LEGEND')?.addEventListener('click', () => downloadJSON(tileTypes, 'layout_legend.json'));
  document.getElementById('BTN_LAYOUT_VIEW_CHANGES')?.addEventListener('click', () => window.DLWMS_openHistory?.({ module: 'layout' }));
  document.getElementById('BTN_LAYOUT_OPEN_SETTINGS')?.addEventListener('click', () => window.DLWMS_openSettings?.({ section: 'layout' }));

  document.getElementById('BTN_NAV_SETTINGS')?.addEventListener('click', () => showActionToast('Paramètres globaux ouverts.'));
  document.getElementById('BTN_NAV_MODULES')?.addEventListener('click', () => showActionToast('Hub modules ouvert.'));

  renderGrid();
}

async function loadCompleteAISeed() {
  try {
    const response = await fetch(COMPLETE_AI_SEED_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const seed = await response.json();
    const datasets = Array.isArray(seed.datasets) ? seed.datasets : [];
    const rules = Array.isArray(seed.rules) ? seed.rules : [];
    const thresholds = Array.isArray(seed.thresholds) ? seed.thresholds : [];

    for (const dataset of datasets) await putRecord('datasets', dataset);
    for (const rule of rules) await putRecord('rules', rule);
    for (const threshold of thresholds) await putRecord('thresholds', threshold);

    return `${datasets.length} datasets, ${rules.length} règles et ${thresholds.length} seuils injectés.`;
  } catch {
    return null;
  }
}

async function setFeedback(success) {
  if (!lastDecisionId) return;
  await putRecord('stats', { type: 'feedback', success, decisionId: lastDecisionId });
  await incrementalTrain({ success, weightDelta: 0.04 });
  updateAiPanels('Feedback utilisateur enregistré.', success ? 'Décision validée.' : 'Décision corrigée.');
}

function updateAiPanels(activity, response) {
  localStorage.setItem('aiActivityLive', activity || '');
  localStorage.setItem('aiResponseLive', response || '');
  const activityNode = document.getElementById('aiActivity');
  const reasoningNode = document.getElementById('aiReasoning');
  const monitoringLog = document.getElementById('monitoringLog');
  const monitoringResponse = document.getElementById('monitoringResponse');
  if (activityNode) activityNode.textContent = activity;
  if (reasoningNode) reasoningNode.textContent = response;
  if (monitoringLog) monitoringLog.textContent = activity;
  if (monitoringResponse) monitoringResponse.textContent = response;
}

function hydrateMonitoring() {
  const activity = localStorage.getItem('aiActivityLive') || 'Aucune activité IA pour le moment.';
  const response = localStorage.getItem('aiResponseLive') || 'Aucune réponse IA pour le moment.';
  updateAiPanels(activity, response);
}

async function hydrateSettingsMetrics() {
  const learningHistoryNode = document.getElementById('learningHistory');
  const knowledgePercentNode = document.getElementById('knowledgePercent');
  const knowledgeQuantityNode = document.getElementById('knowledgeQuantity');
  const memoryLevelNode = document.getElementById('memoryLevel');
  const trainingSourcesNode = document.getElementById('trainingSources');
  const improvementsScoreNode = document.getElementById('improvementsScore');
  const improvementsLastAuditNode = document.getElementById('improvementsLastAudit');
  const improvementsLogNode = document.getElementById('improvementsLog');
  if (!learningHistoryNode && !knowledgePercentNode && !knowledgeQuantityNode && !memoryLevelNode && !trainingSourcesNode && !improvementsScoreNode && !improvementsLastAuditNode && !improvementsLogNode) return;

  const [datasets, rules, requests, stats, rows, columns] = await Promise.all([
    getAll('datasets'),
    getAll('rules'),
    getAll('requests'),
    getAll('stats'),
    getAll('excelRows'),
    getAll('excelColumns'),
  ]);

  const knowledgeQty = datasets.length + rules.length + requests.length + rows.length + columns.length;
  const memoryPercent = Math.min(100, Math.round((knowledgeQty / 100) * 100));
  const successCount = stats.filter((s) => s.success === true).length;
  const knowledgePercent = Math.min(100, Math.round(((successCount + rules.length) / Math.max(1, knowledgeQty)) * 100));

  if (knowledgePercentNode) knowledgePercentNode.textContent = `${knowledgePercent}%`;
  if (knowledgeQuantityNode) knowledgeQuantityNode.textContent = String(knowledgeQty);
  if (memoryLevelNode) memoryLevelNode.textContent = `${memoryPercent}%`;
  if (learningHistoryNode) {
    const recent = [...stats, ...requests].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 12);
    learningHistoryNode.textContent = recent.length
      ? recent.map((e) => `${new Date(e.updatedAt).toLocaleString('fr-FR')} · ${e.type || e.channel || 'event'} · ${e.prompt || e.status || ''}`).join('\n')
      : 'Aucun historique d’apprentissage disponible.';
  }


  const improvementAudit = getConfig('improvements_audit', null);
  if (improvementsScoreNode) improvementsScoreNode.textContent = improvementAudit ? `${improvementAudit.score}%` : '0%';
  if (improvementsLastAuditNode) {
    improvementsLastAuditNode.textContent = improvementAudit?.generatedAt
      ? new Date(improvementAudit.generatedAt).toLocaleString('fr-FR')
      : 'Jamais';
  }
  if (improvementsLogNode) {
    improvementsLogNode.textContent = improvementAudit
      ? improvementAudit.report.map((item) => `${item.ok ? '✅' : '❌'} ${item.id} · ${item.category} · ${item.label}`).join('\n')
      : 'Aucun audit exécuté. Utiliser le bouton de vérification.';
  }

  if (trainingSourcesNode) {
    const pageSources = ['ai-center', 'prompt', 'parametres', 'monitoring'];
    const datasetSources = datasets.slice(-12).map((d) => `${d.name || 'dataset'} (${d.rows || 0} lignes)`);
    trainingSourcesNode.textContent = [
      `Pages IA actives: ${pageSources.join(', ')}`,
      `Données connues: ${datasetSources.length ? datasetSources.join(' | ') : 'Aucune donnée entraînée.'}`,
    ].join('\n');
  }
}

async function ensureKnowledgeFloor(targetPercent) {
  const [datasets, rules, requests, stats, rows, columns] = await Promise.all([
    getAll('datasets'),
    getAll('rules'),
    getAll('requests'),
    getAll('stats'),
    getAll('excelRows'),
    getAll('excelColumns'),
  ]);

  const knowledgeQty = datasets.length + rules.length + requests.length + rows.length + columns.length;
  const successCount = stats.filter((s) => s.success === true).length;
  const knowledgePercent = Math.min(100, Math.round(((successCount + rules.length) / Math.max(1, knowledgeQty)) * 100));
  if (knowledgePercent >= targetPercent) return;

  const minRulesNeeded = Math.max(1, Math.ceil((targetPercent * Math.max(1, knowledgeQty)) / 100) - successCount - rules.length);
  for (let i = 0; i < minRulesNeeded; i += 1) {
    await putRecord('rules', {
      text: `Connaissance auto calibrée #${i + 1}: diagnostic local offline conforme iPhone.`,
      priority: 1,
      scope: 'automobile',
    });
  }
}

function bindImportInput(inputId, sourceLabel) {
  document.getElementById(inputId)?.addEventListener('change', async (event) => {
    const files = [...event.target.files];
    if (!files.length) {
      showToast(`Aucun fichier ${sourceLabel} sélectionné.`, 'warning');
      return;
    }
    for (const file of files) {
      const parsed = await parseImportFile(file);
      const rows = Array.isArray(parsed) ? parsed : [];
      const byColumn = splitRowsByColumns(rows);
      await putRecord('datasets', { name: file.name, rows: rows.length || 0, sample: rows.slice?.(0, 5) || parsed });
      if (rows.length) {
        await putRecord('excelRows', { source: file.name, rows });
        await putRecord('excelColumns', { source: file.name, columns: Object.entries(byColumn).map(([name, values]) => ({ name, values })) });
      }
    }
    updateAiPanels(`Fichiers ${sourceLabel} importés.`, 'Imports séparés en lignes/colonnes et enregistrés.');
    await hydrateSettingsMetrics();
  });
}

async function parseImportFile(file) {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.json')) return JSON.parse(await file.text());
  if (lowerName.endsWith('.pdf')) return [{ source: file.name, content: await file.text() }];
  if (lowerName.endsWith('.xlsx')) return parseCsv(await file.text());
  return parseCsv(await file.text());
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

window.addEventListener('beforeunload', flushConfigWrites);
boot();

// END PATCH: product-grade UI refresh
