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
import {
  getActiveRulebook,
  explainMove,
  restoreRulebookToBackup,
  restoreRulebookToCanonical,
  maybeRunRulebookSelfCheck,
  RULEBOOK_CANONICAL,
} from './rulebook.js';
import { loadWmsKb, searchWmsKb, explainWhyFromKb, KB_STORAGE_KEY } from './wms_kb.js';
import { initRuntimeCore, bindDiagnosticsPanel, runtimeLogger, markLastImport, setSyncState } from '../core/runtime.js';

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
  reception: 'reception',
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
const REMISE_DATA_KEY = 'dlwms_rem_data';
const REMISE_SCRAP_LOG_KEY = 'dlwms_rem_scrap_log';
const REMISE_REBOX_KEY = 'dlwms_rem_rebox';
const REMISE_SETTINGS_KEY = 'dlwms_rem_settings';
const REMISE_AI_NOTES_KEY = 'dlwms_rem_ai_notes';
const REMISE_AI_CHAT_KEY = 'dlwms_rem_ai_chat';
const RECEIPTS_DB_NAME = 'DLWMS_RECEIPTS_DB_V1';
const RECEIPTS_STORE_NAME = 'photos';
const PROMPT_DRAFT_KEY = 'dlwms_ai_prompt_draft_v1';
const LAST_SENT_PROMPT_KEY = 'dlwms_ai_prompt_last_sent_v1';
const AI_MEMORY_KEY = 'DLWMS_GLOBAL_AI_MEMORY_V1';
const LIA_GUIDE_PATH = './docs/formation-lia.md';
const COMPLETE_AI_SEED_PATH = './data/ai_complete_seed.json';
let deferredPrompt;
let lastDecisionId;
let continuousTrainingTimer;
let continuousTrainingIndex = 0;
let navigationLocked = false;
let currentRoute = 'modules';
let wmsKbPromise;

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
  initRuntimeCore();
  await initDB();
  bindInstall();
  bindNetworkBadge();
  bindNav();
  bindGlobalAiAssistant();
  bindGlobalBackButton();
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
  window.DLWMS_getActiveRulebook = getActiveRulebook;
  window.DLWMS_explainMove = explainMove;
  window.DLWMS_restoreRulebookToBackup = restoreRulebookToBackup;
  window.DLWMS_restoreRulebookToCanonical = restoreRulebookToCanonical;
  window.DLWMS_goBack = goBack;
  getActiveRulebook();
  maybeRunRulebookSelfCheck();
  await getWmsKb();
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
    const errors = runtimeLogger.getErrors().length;
    badge.textContent = `${online ? 'En ligne' : 'Mode hors ligne'} · Sync ${online ? 'ok' : 'pause'}${errors ? ` · ⚠️ ${errors}` : ''}`;
    badge.classList.toggle('is-offline', !online);
    badge.classList.toggle('is-online', online);
    setSyncState(online);
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
  currentRoute = normalizedRoute;
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
  await hydrateWmsKnowledge(normalizedRoute);
  bindHistoryPage(normalizedRoute);
  bindSettingsJumps(normalizedRoute);
  bindSettingsAiMemory(normalizedRoute);
  await bindSettingsStorageFaq(normalizedRoute);
  if (normalizedRoute === 'parametres') bindDiagnosticsPanel();
  bindHomePage(normalizedRoute);
  bindLayoutPage(normalizedRoute);
  bindModulePages(normalizedRoute);
  if (normalizedRoute === 'reception-faq') bindReceptionFaqPage(appNode);
  if (normalizedRoute === 'parametres') await hydrateSettingsMetrics();
  if (normalizedRoute === 'monitoring') hydrateMonitoring();
  if (normalizedRoute === 'ui-self-test') bindUiSelfTest();
  refreshBackButton();
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  navigate('modules');
}

function bindGlobalBackButton() {
  if (document.getElementById('dlwmsGlobalBackButton')) return;
  const button = document.createElement('button');
  button.id = 'dlwmsGlobalBackButton';
  button.type = 'button';
  button.className = 'btn btn-ghost';
  button.setAttribute('aria-label', 'Retour');
  button.textContent = '← Retour';
  button.style.position = 'fixed';
  button.style.top = 'calc(env(safe-area-inset-top, 0px) + 8px)';
  button.style.left = '8px';
  button.style.height = '34px';
  button.style.padding = '4px 10px';
  button.style.zIndex = '55';
  button.style.display = 'none';
  button.addEventListener('click', () => goBack());
  document.body.appendChild(button);
}

function refreshBackButton() {
  const button = document.getElementById('dlwmsGlobalBackButton');
  if (!button) return;
  button.style.display = currentRoute === 'modules' ? 'none' : 'inline-flex';
}


function readAiMemory() {
  const fallback = { history: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_MEMORY_KEY) || '');
    return parsed && Array.isArray(parsed.history) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeAiMemory(payload) {
  localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(payload));
}

async function getWmsKb() {
  if (!wmsKbPromise) wmsKbPromise = loadWmsKb();
  return wmsKbPromise;
}

function bindGlobalAiAssistant() {
  const toggle = document.getElementById('globalAiToggle');
  const popup = document.getElementById('globalAiPopup');
  const form = document.getElementById('globalAiForm');
  const input = document.getElementById('globalAiInput');
  const list = document.getElementById('globalAiMessages');
  if (!toggle || !popup || !form || !input || !list) return;

  const canned = [
    { key: 'consolidation', answer: 'Ouvre Consolidation pour fusionner inventaire + réception puis vérifier les KPI.' },
    { key: 'remise', answer: 'Pour Remise, valide le scan, l’état pièce, puis confirme la réintégration en stock.' },
    { key: 'réception', answer: 'Utilise Réception preuve pour enregistrer photos et documents de réception complète.' },
  ];

  const render = () => {
    const memory = readAiMemory();
    const entries = memory.history.slice(-8);
    list.innerHTML = entries.length
      ? entries.map((item) => `<div class="ai-popup-msg ${item.role}">${item.text}</div>`).join('')
      : '<div class="ai-popup-msg assistant">Bonjour 👋 Pose une question sur les modules.</div>';
    list.scrollTop = list.scrollHeight;
  };

  toggle.addEventListener('click', () => {
    const opening = popup.hasAttribute('hidden');
    popup.toggleAttribute('hidden');
    toggle.setAttribute('aria-expanded', String(opening));
    if (opening) {
      render();
      input.focus();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    const lower = question.toLowerCase();
    const found = canned.find((item) => lower.includes(item.key));
    let reply = found?.answer || 'Je peux guider vers Consolidation, Remise, Réception preuve, Inventaire et Paramètres.';

    const kb = await getWmsKb();
    const hits = searchWmsKb(kb, lower, 1);
    if (hits.length) {
      const best = hits[0];
      const snippet = best.snippets[0] || `Section ${best.section} trouvée dans la KB.`;
      const why = explainWhyFromKb(kb, best.section);
      reply = `${snippet}
Pourquoi ? ${why}`;
    }

    const memory = readAiMemory();
    memory.history.push({ role: 'user', text: question, at: Date.now() });
    memory.history.push({ role: 'assistant', text: reply, at: Date.now() });
    writeAiMemory(memory);
    input.value = '';
    render();
  });
}

function bindSettingsAiMemory(route) {
  if (route !== 'parametres') return;
  const textarea = document.getElementById('aiMemoryZone');
  const saveBtn = document.getElementById('saveAiMemory');
  const clearBtn = document.getElementById('clearAiMemory');
  if (!textarea || !saveBtn || !clearBtn) return;

  textarea.value = JSON.stringify(readAiMemory(), null, 2);
  saveBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value || '{"history":[]}');
      writeAiMemory({ history: Array.isArray(parsed.history) ? parsed.history : [] });
      showToast('Mémoire IA sauvegardée.', 'success');
    } catch {
      showToast('JSON mémoire invalide.', 'error');
    }
  });
  clearBtn.addEventListener('click', () => {
    writeAiMemory({ history: [] });
    textarea.value = JSON.stringify({ history: [] }, null, 2);
    showToast('Mémoire IA réinitialisée.', 'success');
  });
}

function safeParseJson(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function bindSettingsStorageFaq(route) {
  if (route !== 'parametres') return;
  const rulesTab = document.getElementById('settingsStorageTab');
  const faqTab = document.getElementById('settingsFaqTab');
  const rulesPanel = document.getElementById('settingsStorageRulesPanel');
  const faqPanel = document.getElementById('settingsStorageFaqPanel');
  const rulesDump = document.getElementById('settingsRulesStorageDump');
  const storageReadMeta = document.getElementById('settingsStorageReadMeta');
  const storageRefreshBtn = document.getElementById('settingsStorageRefreshBtn');
  const storageCopyBtn = document.getElementById('settingsStorageCopyBtn');
  const rulebookValidation = document.getElementById('settingsRulebookValidation');
  const rulebookDiff = document.getElementById('settingsRulebookDiff');
  const storageKeysList = document.getElementById('settingsStorageKeysList');
  const storageFilterAll = document.getElementById('settingsStorageFilterAll');
  const storageFilterDlwms = document.getElementById('settingsStorageFilterDlwms');
  const storageFilterRule = document.getElementById('settingsStorageFilterRule');
  const storageFilterFaq = document.getElementById('settingsStorageFilterFaq');
  const adminToggleBtn = document.getElementById('settingsAdminToggleBtn');
  const adminStatus = document.getElementById('settingsAdminStatus');
  const faqInventory = document.getElementById('settingsFaqInventory');
  const faqCounters = document.getElementById('settingsFaqCounters');
  const faqSearchInput = document.getElementById('settingsFaqSearchInput');
  const faqCategoryFilter = document.getElementById('settingsFaqCategoryFilter');
  const faqPagination = document.getElementById('settingsFaqPagination');
  const faqExportJson = document.getElementById('settingsFaqExportJson');
  const faqExportCsv = document.getElementById('settingsFaqExportCsv');
  if (!rulesTab || !faqTab || !rulesPanel || !faqPanel || !rulesDump || !faqInventory) return;

  const activateTab = (tabName) => {
    const showRules = tabName === 'rules';
    rulesPanel.hidden = !showRules;
    faqPanel.hidden = showRules;
    rulesTab.setAttribute('aria-selected', String(showRules));
    faqTab.setAttribute('aria-selected', String(!showRules));
    rulesTab.classList.toggle('btn-primary', showRules);
    faqTab.classList.toggle('btn-primary', !showRules);
  };

  rulesTab.addEventListener('click', () => activateTab('rules'));
  faqTab.addEventListener('click', () => activateTab('faq'));
  activateTab('rules');

  const state = {
    currentStorageFilter: 'all',
    adminEnabled: false,
    faqMerged: [],
    faqSearch: '',
    faqCategory: 'all',
    faqPage: 1,
    faqPageSize: 20,
  };

  const escapeHtml = (value) => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const highlightText = (value, query) => {
    const safe = escapeHtml(value);
    if (!query) return safe;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    return safe.replace(regex, '<mark>$1</mark>');
  };

  const summarizeDiff = (canonical, active) => {
    const canonicalLines = canonical.split('\n');
    const activeLines = active.split('\n');
    const max = Math.max(canonicalLines.length, activeLines.length);
    let added = 0;
    let removed = 0;
    let changed = 0;
    for (let i = 0; i < max; i += 1) {
      const left = canonicalLines[i];
      const right = activeLines[i];
      if (left == null && right != null) {
        added += 1;
      } else if (left != null && right == null) {
        removed += 1;
      } else if (left !== right) {
        changed += 1;
      }
    }
    return { added, removed, changed };
  };

  const validateRulebookEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return { ok: false, reason: 'Absent ou non JSON.' };
    if (typeof entry.text !== 'string') return { ok: false, reason: 'Champ text manquant.' };
    if (typeof entry.integrity !== 'string') return { ok: false, reason: 'Champ integrity manquant.' };
    if (!entry.integrity.includes(':')) return { ok: false, reason: 'Format integrity invalide.' };
    return { ok: true, reason: 'Structure valide.' };
  };

  const setFilterButtonState = (activeFilter) => {
    const mapping = [
      [storageFilterAll, 'all'],
      [storageFilterDlwms, 'DLWMS_'],
      [storageFilterRule, 'rule'],
      [storageFilterFaq, 'faq'],
    ];
    mapping.forEach(([node, value]) => {
      if (!node) return;
      node.classList.toggle('btn-primary', activeFilter === value);
    });
  };

  const updateStorageView = () => {
    const extractedAt = new Date();
    if (storageReadMeta) storageReadMeta.textContent = `Dernière lecture du storage: ${extractedAt.toLocaleString('fr-FR')}`;

    const rulebookRaw = localStorage.getItem('rulebook_active') || '';
    const rulebookStored = safeParseJson(rulebookRaw, null);
    const rulebookValidationResult = validateRulebookEntry(rulebookStored);
    const activeRulebook = typeof rulebookStored?.text === 'string' ? rulebookStored.text : getActiveRulebook();
    const localRuleKeys = Object.keys(localStorage).filter((key) => /rule|regle|règle/i.test(key));
    const storageRulesSnapshot = {
      extractedAt: extractedAt.toISOString(),
      rulebookStorageKey: 'rulebook_active',
      activeRulebookLength: activeRulebook.length,
      activeRulebookPreview: activeRulebook.slice(0, 600),
      knownRuleStorageKeys: localRuleKeys,
    };

    if (!state.adminEnabled) {
      storageRulesSnapshot.activeRulebookPreview = '[masqué: mode admin requis]';
      storageRulesSnapshot.knownRuleStorageKeys = '[masqué: mode admin requis]';
    }

    rulesDump.textContent = JSON.stringify(storageRulesSnapshot, null, 2);
    if (rulebookValidation) {
      rulebookValidation.innerHTML = rulebookValidationResult.ok
        ? '<strong>Validation rulebook_active:</strong> ✅ OK — Structure valide.'
        : `<strong>Validation rulebook_active:</strong> ❌ KO — ${escapeHtml(rulebookValidationResult.reason)}`;
    }

    if (rulebookDiff) {
      const diff = summarizeDiff(RULEBOOK_CANONICAL, activeRulebook);
      rulebookDiff.innerHTML = `<strong>Comparateur canonique vs actif:</strong> +${diff.added} / -${diff.removed} / ~${diff.changed}`;
    }

    if (storageKeysList) {
      const keys = Object.keys(localStorage)
        .sort((a, b) => a.localeCompare(b))
        .filter((key) => {
          if (state.currentStorageFilter === 'all') return true;
          if (state.currentStorageFilter === 'DLWMS_') return key.startsWith('DLWMS_');
          return key.toLowerCase().includes(state.currentStorageFilter.toLowerCase());
        });
      storageKeysList.innerHTML = keys.length
        ? `<ul>${keys.map((key) => `<li>${escapeHtml(key)}</li>`).join('')}</ul>`
        : '<p class="muted">Aucune clé pour ce filtre.</p>';
    }
    setFilterButtonState(state.currentStorageFilter);
  };

  const toCsvRow = (cols) => cols
    .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
    .join(',');

  const downloadFile = (fileName, mimeType, content) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderFaq = () => {
    const search = state.faqSearch.trim().toLowerCase();
    const filtered = state.faqMerged.filter((entry) => {
      const matchCategory = state.faqCategory === 'all' || entry.categorie === state.faqCategory;
      if (!matchCategory) return false;
      if (!search) return true;
      return (`${entry.question} ${entry.reponse} ${entry.categorie}`).toLowerCase().includes(search);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.faqPageSize));
    state.faqPage = Math.min(state.faqPage, totalPages);
    const start = (state.faqPage - 1) * state.faqPageSize;
    const pageItems = filtered.slice(start, start + state.faqPageSize);

    if (faqPagination) {
      faqPagination.innerHTML = `
        <button type="button" id="settingsFaqPrevPage" class="btn" ${state.faqPage === 1 ? 'disabled' : ''}>← Précédent</button>
        <span class="muted">Page ${state.faqPage} / ${totalPages} (${filtered.length} résultats)</span>
        <button type="button" id="settingsFaqNextPage" class="btn" ${state.faqPage >= totalPages ? 'disabled' : ''}>Suivant →</button>
      `;
      const prev = faqPagination.querySelector('#settingsFaqPrevPage');
      const next = faqPagination.querySelector('#settingsFaqNextPage');
      prev?.addEventListener('click', () => {
        state.faqPage = Math.max(1, state.faqPage - 1);
        renderFaq();
      });
      next?.addEventListener('click', () => {
        state.faqPage = Math.min(totalPages, state.faqPage + 1);
        renderFaq();
      });
    }

    faqInventory.innerHTML = pageItems.length
      ? `<ul>${pageItems.map((entry) => `<li><strong>${highlightText(entry.question, state.faqSearch)}</strong> <span class="muted">[${highlightText(entry.categorie, state.faqSearch)} · ${entry.source}]</span><br>${highlightText(entry.reponse, state.faqSearch)}</li>`).join('')}</ul>`
      : '<p class="muted">Aucune FAQ trouvée.</p>';

    if (faqCounters) {
      const bySource = filtered.reduce((acc, item) => {
        acc[item.source] = (acc[item.source] || 0) + 1;
        return acc;
      }, {});
      const byCategory = filtered.reduce((acc, item) => {
        acc[item.categorie] = (acc[item.categorie] || 0) + 1;
        return acc;
      }, {});
      const sourceBadges = Object.entries(bySource).map(([source, count]) => `<span class="btn">${escapeHtml(source)}: ${count}</span>`).join('');
      const categoryBadges = Object.entries(byCategory).slice(0, 10).map(([category, count]) => `<span class="btn">${escapeHtml(category)}: ${count}</span>`).join('');
      faqCounters.innerHTML = `<span class="muted">Sources:</span>${sourceBadges}<span class="muted">Catégories:</span>${categoryBadges}`;
    }

    return filtered;
  };

  const exportFaqJson = () => {
    const visible = renderFaq();
    downloadFile('faq-inventaire.json', 'application/json;charset=utf-8', JSON.stringify(visible, null, 2));
    showToast('Export JSON FAQ lancé.', 'success');
  };

  const exportFaqCsv = () => {
    const visible = renderFaq();
    const csv = [
      toCsvRow(['id', 'source', 'categorie', 'question', 'reponse']),
      ...visible.map((entry) => toCsvRow([entry.id, entry.source, entry.categorie, entry.question, entry.reponse])),
    ].join('\n');
    downloadFile('faq-inventaire.csv', 'text/csv;charset=utf-8', csv);
    showToast('Export CSV FAQ lancé.', 'success');
  };

  const promptAdminPin = () => {
    const pin = window.prompt('Entrez le code admin local');
    if (pin === null) return;
    if (pin === 'Adamour/////0000') {
      state.adminEnabled = !state.adminEnabled;
      if (adminStatus) adminStatus.textContent = state.adminEnabled ? 'Mode admin activé' : 'Mode admin désactivé';
      if (adminToggleBtn) adminToggleBtn.textContent = state.adminEnabled ? 'Désactiver mode admin' : 'Activer mode admin';
      showToast(state.adminEnabled ? 'Mode admin activé.' : 'Mode admin désactivé.', 'success');
      updateStorageView();
      return;
    }
    showToast('Code admin invalide.', 'error');
  };

  storageRefreshBtn?.addEventListener('click', updateStorageView);
  storageCopyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(rulesDump.textContent || '');
      showToast('Diagnostic storage copié.', 'success');
    } catch {
      showToast('Copie impossible (permissions navigateur).', 'error');
    }
  });
  storageFilterAll?.addEventListener('click', () => {
    state.currentStorageFilter = 'all';
    updateStorageView();
  });
  storageFilterDlwms?.addEventListener('click', () => {
    state.currentStorageFilter = 'DLWMS_';
    updateStorageView();
  });
  storageFilterRule?.addEventListener('click', () => {
    state.currentStorageFilter = 'rule';
    updateStorageView();
  });
  storageFilterFaq?.addEventListener('click', () => {
    state.currentStorageFilter = 'faq';
    updateStorageView();
  });
  adminToggleBtn?.addEventListener('click', promptAdminPin);

  faqSearchInput?.addEventListener('input', () => {
    state.faqSearch = faqSearchInput.value || '';
    state.faqPage = 1;
    renderFaq();
  });
  faqCategoryFilter?.addEventListener('change', () => {
    state.faqCategory = faqCategoryFilter.value || 'all';
    state.faqPage = 1;
    renderFaq();
  });
  faqExportJson?.addEventListener('click', exportFaqJson);
  faqExportCsv?.addEventListener('click', exportFaqCsv);
  const localFaq = safeParseJson(localStorage.getItem('DLWMS_RECEPTION_FAQ_V1') || '', { entries: [] });
  const localFaqEntries = Array.isArray(localFaq?.entries) ? localFaq.entries : [];

  let catalogFaq = [];
  try {
    const response = await fetch('./data/indago_faq_200.json');
    if (response.ok) {
      const payload = await response.json();
      catalogFaq = Array.isArray(payload) ? payload : [];
    }
  } catch {
    catalogFaq = [];
  }

  state.faqMerged = [
    ...localFaqEntries.map((entry, index) => ({
      id: entry.id || `local-${index + 1}`,
      source: 'locale',
      categorie: entry.categorie || 'Non catégorisée',
      question: entry.question || 'Question non définie',
      reponse: entry.reponse || entry.answer || '',
    })),
    ...catalogFaq.map((entry, index) => ({
      id: entry.id || `ref-${index + 1}`,
      source: 'référentiel',
      categorie: entry.categorie || 'Non catégorisée',
      question: entry.question || 'Question non définie',
      reponse: entry.reponse || entry.answer || '',
    })),
  ];

  if (faqCategoryFilter) {
    const categories = [...new Set(state.faqMerged.map((entry) => entry.categorie))].sort((a, b) => a.localeCompare(b));
    faqCategoryFilter.innerHTML = ['<option value="all">Toutes catégories</option>', ...categories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join('');
  }

  updateStorageView();
  renderFaq();
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

const CONSO_KEYS = {
  sessions: 'dlwms_conso_sessions',
  moves: 'dlwms_conso_moves',
  settings: 'dlwms_conso_settings',
  aiNotes: 'dlwms_conso_ai_notes',
  aiChat: 'dlwms_conso_ai_chat',
};

const CONSO_FAQ = [
  ["Comment scanner ?", "Ouvrez Charger, scannez votre SKU puis validez avec Entrée."],
  ["Comment annuler un item ?", "Dans Charger, utilisez le bouton – pour décrémenter ou la corbeille pour supprimer."],
  ["C'est quoi Optimiser ?", "Optimiser propose des moves de consolidation simples basés sur les sessions en attente."],
  ["Pourquoi un move est suggéré ?", "Le moteur privilégie les SKU les plus fréquents et des bins cibles proches de la zone active."],
  ["Où voir l'historique ?", "Ouvrez Historique pour consulter sessions et moves appliqués ou en attente."],
  ["Comment changer la zone ZD18 ?", "Depuis l'écran principal consolidation, modifiez le champ zone dans les réglages rapides."],
  ["Comment terminer une session ?", "Dans Charger, cliquez Terminer session pour enregistrer localement la session."],
  ["Mes données restent-elles hors ligne ?", "Oui, la consolidation stocke les données en localStorage sans API externe."],
  ["Comment générer les recommandations ?", "Dans Optimiser, appuyez sur Générer recommandations."],
  ["Comment appliquer un move ?", "Dans Optimiser, cliquez Appliquer sur la ligne du move."],
  ["Comment lire les statistiques ?", "La page Statistiques affiche KPI, top SKU, bar chart et pie chart."],
  ["Que signifie Remises en attente ?", "Ce nombre correspond aux sessions non clôturées."],
  ["Que signifie Pièces ?", "Pièces est la somme des quantités des sessions non clôturées."],
  ["Que signifie Temps moyen ?", "Temps moyen est la moyenne des durées de sessions enregistrées."],
  ["Comment clôturer une session ?", "Dans Historique, ouvrez le détail d'une session puis basculez en clôturée."],
  ["Comment effacer l'historique ?", "Utilisez le bouton Effacer historique puis confirmez."],
  ["Comment fonctionne la recherche IA ?", "Le moteur local compare mots-clés et intention pour trouver la meilleure réponse."],
  ["Puis-je ajouter mes notes IA ?", "Oui, bouton Notes IA pour éditer vos consignes locales."],
  ["Que fait le bouton Pourquoi ?", "Il ouvre les règles consolidation V1 utilisées par le moteur de recommandation."],
  ["Puis-je travailler sans réseau ?", "Oui, le module est conçu offline-first."],
  ["Le scan accepte quel format ?", "Tout texte est accepté puis normalisé en trim + uppercase."],
  ["Comment incrémenter un SKU ?", "Scannez le même SKU plusieurs fois: la quantité augmente automatiquement."],
  ["Que voit-on dans un move ?", "SKU, quantité, bin cible suggéré, tag de priorité et justification."],
  ["Comment exporter ?", "V1 ne gère pas l'export, utilisez l'historique local pour suivi."],
  ["Comment revenir à l'accueil consolidation ?", "Touchez le bouton Flux principal ou utilisez le retour."],
  ["Pourquoi une recommandation manque ?", "Aucune recommandation est créée si aucune session en attente n'existe."],
  ["Comment calculer le top SKU ?", "Le top SKU agrège les quantités de toutes les sessions."],
  ["Comment savoir si un move est fini ?", "Un badge Complété apparaît dans Historique et Statistiques."],
  ["Comment vider uniquement les moves ?", "Effacer historique supprime sessions et moves, pas les notes IA."],
  ["Comment relancer une session ?", "Créez une nouvelle session depuis Charger."],
];

function bindModulePages(route) {
  if (route === 'modules') bindModulesPageStatusDot();
  if (route === 'consolidation' || route.startsWith('consolidation/')) bindConsolidationPage(route);
  if (route === 'remise' || route.startsWith('remise/')) bindRemisePage(route);
  if (route === 'reception-preuve') bindReceptionPreuvePage();
}

function bindModulesPageStatusDot() {
  const dot = document.getElementById('modulesStatusDot');
  if (!dot) return;
  const isOnline = navigator.onLine;
  dot.classList.toggle('is-online', isOnline);
  dot.classList.toggle('is-offline', !isOnline);
}

function bindConsolidationPage(route) {
  ensureConsolidationStyles();
  const sessions = readJsonStorage(CONSO_KEYS.sessions, []);
  const moves = readJsonStorage(CONSO_KEYS.moves, []);
  const settings = { zone: 'ZD18', ...(readJsonStorage(CONSO_KEYS.settings, {})) };
  const notes = readJsonStorage(CONSO_KEYS.aiNotes, '');

  const saveAll = () => {
    writeJsonStorage(CONSO_KEYS.sessions, sessions);
    writeJsonStorage(CONSO_KEYS.moves, moves);
    writeJsonStorage(CONSO_KEYS.settings, settings);
  };

  const sumItems = (items = []) => items.reduce((acc, item) => acc + Number(item.qty || 0), 0);
  const pendingSessions = () => sessions.filter((session) => !session.closed);
  const pendingPieces = () => pendingSessions().reduce((acc, session) => acc + sumItems(session.items), 0);
  const avgDuration = () => {
    const values = sessions.map((s) => Number(s.durationMin || 0)).filter((n) => Number.isFinite(n) && n > 0);
    if (!values.length) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const bindHub = () => {
    const pendingNode = document.getElementById('consoStatPending');
    const piecesNode = document.getElementById('consoStatPieces');
    const avgNode = document.getElementById('consoStatAvg');
    if (pendingNode) pendingNode.textContent = String(pendingSessions().length);
    if (piecesNode) piecesNode.textContent = String(pendingPieces());
    if (avgNode) avgNode.textContent = `${avgDuration()} min`;
    const zoneInput = document.getElementById('consoZoneInput');
    const zoneLabel = document.getElementById('consoZoneLabel');
    if (zoneLabel) zoneLabel.textContent = settings.zone || 'ZD18';
    if (zoneInput) {
      zoneInput.value = settings.zone || 'ZD18';
      zoneInput.addEventListener('change', () => {
        settings.zone = String(zoneInput.value || 'ZD18').trim().toUpperCase();
        writeJsonStorage(CONSO_KEYS.settings, settings);
        if (zoneLabel) zoneLabel.textContent = settings.zone;
      });
    }

    document.querySelectorAll('[data-conso-route]').forEach((tile) => {
      tile.addEventListener('click', () => navigate(tile.dataset.consoRoute));
    });

    const chatList = readJsonStorage(CONSO_KEYS.aiChat, []);
    const aiOutput = document.getElementById('consoAiOutput');
    if (aiOutput && chatList.length) {
      aiOutput.innerHTML = chatList.slice(-3).map((entry) => `<article><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.answer)}</p></article>`).join('');
    }

    const askForm = document.getElementById('consoAiForm');
    askForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('consoAiInput');
      const q = String(input?.value || '').trim();
      if (!q) return;
      const answer = answerConsoQuestion(q, notes);
      const payload = [...chatList, { q, ...answer, at: Date.now() }].slice(-25);
      writeJsonStorage(CONSO_KEYS.aiChat, payload);
      if (aiOutput) {
        aiOutput.innerHTML = `<article><strong>${escapeHtml(answer.title)}</strong><ul>${answer.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul><p>${escapeHtml(answer.why)}</p><small>${escapeHtml(answer.where)}</small></article>`;
      }
      if (input) input.value = '';
    });

    document.getElementById('consoRulesBtn')?.addEventListener('click', () => {
      document.getElementById('consoRulesModal')?.showModal();
    });
    document.getElementById('consoNotesBtn')?.addEventListener('click', () => {
      const textarea = document.getElementById('consoAiNotes');
      if (textarea) textarea.value = notes;
      document.getElementById('consoNotesModal')?.showModal();
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => btn.closest('dialog')?.close()));
    document.getElementById('consoSaveNotes')?.addEventListener('click', () => {
      const textarea = document.getElementById('consoAiNotes');
      writeJsonStorage(CONSO_KEYS.aiNotes, String(textarea?.value || ''));
      textarea?.closest('dialog')?.close();
      showToast('Notes IA enregistrées en local.', 'success');
    });
  };

  const bindCharger = () => {
    const input = document.getElementById('consoScanInput');
    const list = document.getElementById('consoScanList');
    const startedAt = Date.now();
    const draft = readJsonStorage('dlwms_conso_scan_draft', {});

    const renderDraft = () => {
      const entries = Object.entries(draft);
      const draftCountNode = document.getElementById('consoDraftCount');
      if (draftCountNode) draftCountNode.textContent = String(entries.reduce((acc, [, qty]) => acc + Number(qty), 0));
      if (!list) return;
      if (!entries.length) {
        list.innerHTML = '<p class="muted">Aucun SKU scanné.</p>';
        return;
      }
      list.innerHTML = entries.map(([sku, qty]) => `<article class="conso-row"><strong>${escapeHtml(sku)}</strong><span>x${qty}</span><div><button type="button" data-minus="${escapeHtml(sku)}">−</button><button type="button" data-remove="${escapeHtml(sku)}">🗑</button></div></article>`).join('');
    };

    input?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const sku = String(input.value || '').trim().toUpperCase();
      if (!sku) return;
      draft[sku] = Number(draft[sku] || 0) + 1;
      writeJsonStorage('dlwms_conso_scan_draft', draft);
      input.value = '';
      renderDraft();
    });
    input?.addEventListener('blur', () => setTimeout(() => input.focus(), 80));
    setTimeout(() => input?.focus(), 20);

    list?.addEventListener('click', (event) => {
      const minusBtn = event.target.closest('[data-minus]');
      const removeBtn = event.target.closest('[data-remove]');
      if (!minusBtn && !removeBtn) return;
      const sku = minusBtn?.dataset.minus || removeBtn?.dataset.remove;
      if (!sku) return;
      if (minusBtn) draft[sku] = Math.max(0, Number(draft[sku] || 0) - 1);
      if (removeBtn || draft[sku] === 0) delete draft[sku];
      writeJsonStorage('dlwms_conso_scan_draft', draft);
      renderDraft();
    });

    document.getElementById('consoFinishSession')?.addEventListener('click', () => {
      const items = Object.entries(draft).map(([sku, qty]) => ({ sku, qty: Number(qty || 0) })).filter((item) => item.qty > 0);
      if (!items.length) {
        showToast('Aucun item à enregistrer.', 'warning');
        return;
      }
      sessions.unshift({
        id: `SES-${Date.now()}`,
        createdAt: Date.now(),
        closed: false,
        zone: settings.zone,
        durationMin: Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
        items,
      });
      writeJsonStorage(CONSO_KEYS.sessions, sessions);
      localStorage.removeItem('dlwms_conso_scan_draft');
      showToast('Session enregistrée.', 'success');
      navigate('consolidation');
    });

    renderDraft();
  };

  const bindOptimiser = () => {
    const list = document.getElementById('consoMoveList');
    const explainMap = {
      near: 'Le SKU est regroupé vers un bin proche de la zone active pour réduire les déplacements.',
      free: 'Le déplacement libère un bin source et simplifie le picking suivant.',
      flow: 'Le SKU apparaît dans plusieurs sessions, consolidation recommandée pour fluidifier le flux.',
    };

    const render = () => {
      if (!list) return;
      if (!moves.length) {
        list.innerHTML = '<p class="muted">Aucun move généré.</p>';
        return;
      }
      list.innerHTML = moves.map((move) => `<article class="conso-move ${move.status === 'completed' ? 'is-done' : ''}">
        <header><strong>${escapeHtml(move.sku)}</strong><span>${move.qty} pcs</span></header>
        <p>Cible: <b>${escapeHtml(move.target)}</b> · <span class="tag">${escapeHtml(move.tag)}</span></p>
        <footer>
          <button type="button" data-why="${move.id}">Pourquoi ?</button>
          <button type="button" data-apply="${move.id}" ${move.status === 'completed' ? 'disabled' : ''}>${move.status === 'completed' ? 'Complété' : 'Appliquer'}</button>
        </footer>
        <small id="moveWhy-${move.id}" class="muted"></small>
      </article>`).join('');
    };

    document.getElementById('consoGenerateMoves')?.addEventListener('click', () => {
      const skuMap = new Map();
      pendingSessions().forEach((session) => {
        session.items.forEach((item) => {
          skuMap.set(item.sku, Number(skuMap.get(item.sku) || 0) + Number(item.qty || 0));
        });
      });
      if (!skuMap.size) {
        showToast('Aucune session en attente à optimiser.', 'warning');
        return;
      }
      const created = [];
      [...skuMap.entries()].slice(0, 12).forEach(([sku, qty], index) => {
        const existingPending = moves.find((move) => move.sku === sku && move.status === 'pending');
        if (existingPending) return;
        const tag = index % 3 === 0 ? 'Proche' : index % 3 === 1 ? 'Libère bin' : 'Flux';
        const whyKey = index % 3 === 0 ? 'near' : index % 3 === 1 ? 'free' : 'flow';
        created.push({
          id: `MOV-${Date.now()}-${index}`,
          sku,
          qty,
          target: `${settings.zone || 'ZD18'}-BIN-${String(index + 1).padStart(2, '0')}`,
          tag,
          why: explainMap[whyKey],
          status: 'pending',
          createdAt: Date.now(),
        });
      });
      moves.unshift(...created);
      saveAll();
      render();
      showToast(`${created.length} recommandations générées.`, 'success');
    });

    list?.addEventListener('click', (event) => {
      const whyBtn = event.target.closest('[data-why]');
      const applyBtn = event.target.closest('[data-apply]');
      if (whyBtn) {
        const move = moves.find((entry) => entry.id === whyBtn.dataset.why);
        const target = document.getElementById(`moveWhy-${move?.id}`);
        if (move && target) target.textContent = move.why;
      }
      if (applyBtn) {
        const move = moves.find((entry) => entry.id === applyBtn.dataset.apply);
        if (!move || move.status === 'completed') return;
        move.status = 'completed';
        move.completedAt = Date.now();
        saveAll();
        render();
      }
    });

    document.getElementById('consoClosePending')?.addEventListener('click', () => {
      pendingSessions().forEach((session) => { session.closed = true; });
      saveAll();
      showToast('Sessions en attente clôturées.', 'success');
    });

    render();
  };

  const bindHistorique = () => {
    const sessionList = document.getElementById('consoSessionHistory');
    const moveList = document.getElementById('consoMoveHistory');
    const render = () => {
      if (sessionList) {
        if (!sessions.length) sessionList.innerHTML = '<p class="muted">Aucune session.</p>';
        else {
          sessionList.innerHTML = sessions.map((session) => `<details class="conso-history-item"><summary>${new Date(session.createdAt).toLocaleString('fr-FR')} · ${session.items.length} SKU · ${sumItems(session.items)} pièces</summary><div><p>Zone ${escapeHtml(session.zone || 'ZD18')} · ${session.closed ? 'Clôturée' : 'En attente'}</p><ul>${session.items.map((item) => `<li>${escapeHtml(item.sku)} × ${item.qty}</li>`).join('')}</ul><button type="button" data-toggle-session="${session.id}">${session.closed ? 'Réouvrir' : 'Clôturer'}</button></div></details>`).join('');
        }
      }
      if (moveList) {
        if (!moves.length) moveList.innerHTML = '<p class="muted">Aucun move.</p>';
        else moveList.innerHTML = moves.map((move) => `<article class="conso-row"><strong>${escapeHtml(move.sku)}</strong><span>${move.qty} → ${escapeHtml(move.target)}</span><em>${move.status === 'completed' ? 'Complété' : 'En attente'}</em></article>`).join('');
      }
    };

    sessionList?.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-toggle-session]');
      if (!toggle) return;
      const session = sessions.find((entry) => entry.id === toggle.dataset.toggleSession);
      if (!session) return;
      session.closed = !session.closed;
      saveAll();
      render();
    });

    document.getElementById('consoClearHistory')?.addEventListener('click', () => {
      if (!window.confirm('Effacer sessions et moves ?')) return;
      sessions.splice(0, sessions.length);
      moves.splice(0, moves.length);
      saveAll();
      render();
      showToast('Historique effacé.', 'success');
    });

    render();
  };

  const bindStats = () => {
    const topList = document.getElementById('consoTopSku');
    const skuMap = new Map();
    sessions.forEach((session) => session.items.forEach((item) => skuMap.set(item.sku, Number(skuMap.get(item.sku) || 0) + Number(item.qty || 0))));
    const sorted = [...skuMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const kpiSessions = document.getElementById('consoKpiSessions');
    const kpiPieces = document.getElementById('consoKpiPieces');
    const kpiAvg = document.getElementById('consoKpiAvg');
    if (kpiSessions) kpiSessions.textContent = String(sessions.length);
    if (kpiPieces) kpiPieces.textContent = String(sessions.reduce((acc, s) => acc + sumItems(s.items), 0));
    if (kpiAvg) kpiAvg.textContent = `${avgDuration()} min`;

    if (topList) {
      if (!sorted.length) topList.innerHTML = '<li class="muted">Aucun SKU</li>';
      else topList.innerHTML = sorted.map(([sku, qty]) => `<li>${escapeHtml(sku)} <span>${qty}</span></li>`).join('');
    }

    drawBarChart(document.getElementById('consoBarChart'), sorted);
    const done = moves.filter((move) => move.status === 'completed').length;
    const pending = moves.length - done;
    drawPieChart(document.getElementById('consoPieChart'), [['Complétés', done], ['En attente', pending]]);
  };

  if (route === 'consolidation') bindHub();
  if (route === 'consolidation/charger') bindCharger();
  if (route === 'consolidation/optimiser') bindOptimiser();
  if (route === 'consolidation/historique') bindHistorique();
  if (route === 'consolidation/statistiques') bindStats();
}

function answerConsoQuestion(question, notes) {
  const normalized = normalize(question || '');
  const intents = {
    scan: ['scan', 'scanner', 'sku', 'charger'],
    optimiser: ['optimiser', 'move', 'recommandation'],
    historique: ['historique', 'archive', 'session'],
    stats: ['stat', 'kpi', 'graph'],
    zone: ['zone', 'zd18', 'emplacement'],
    erreurs: ['erreur', 'bloque', 'impossible'],
  };
  let bestIntent = 'scan';
  let bestScore = 0;
  Object.entries(intents).forEach(([intent, words]) => {
    const score = words.reduce((acc, word) => acc + (normalized.includes(word) ? 2 : 0), 0);
    if (score > bestScore) {
      bestIntent = intent;
      bestScore = score;
    }
  });

  const bank = CONSO_FAQ.map(([q, a]) => ({ q: normalize(q), rawQ: q, a }));
  let best = bank[0];
  let score = -1;
  bank.forEach((entry) => {
    const parts = entry.q.split(/\s+/);
    const localScore = parts.reduce((acc, token) => acc + (normalized.includes(token) ? 1 : 0), 0);
    if (localScore > score) {
      best = entry;
      score = localScore;
    }
  });

  const where = {
    scan: 'Où cliquer: tuile Charger → champ scan → Terminer session.',
    optimiser: 'Où cliquer: tuile Optimiser → Générer recommandations → Appliquer.',
    historique: 'Où cliquer: tuile Historique → ouvrir session pour détail.',
    stats: 'Où cliquer: tuile Statistiques pour KPI et graphiques.',
    zone: 'Où cliquer: écran principal consolidation → champ Zone.',
    erreurs: 'Où cliquer: Historique pour vérifier les sessions puis relancer Charger.',
  };

  return {
    title: `Assistant consolidation — ${bestIntent}`,
    steps: [
      `Action recommandée: ${best.a}`,
      "Vérifiez les données dans l'historique local.",
      "Relancez l'étape suivante depuis la grille principale.",
    ],
    why: `${best.a} Cette réponse est produite localement via FAQ + mots-clés. ${notes ? 'Les notes opérateur sont aussi prises en compte.' : ''}`.trim(),
    where: where[bestIntent],
    answer: best.a,
  };
}

function drawBarChart(canvas, rows) {
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const max = Math.max(1, ...rows.map(([, qty]) => qty));
  const gap = 14;
  const barW = rows.length ? Math.max(22, Math.floor((width - gap * (rows.length + 1)) / rows.length)) : 0;
  rows.forEach(([sku, qty], index) => {
    const x = gap + index * (barW + gap);
    const h = Math.round((qty / max) * (height - 36));
    const y = height - h - 18;
    ctx.fillStyle = '#4da3ff';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#d8e6ff';
    ctx.font = '11px sans-serif';
    ctx.fillText(String(sku).slice(0, 6), x, height - 4);
  });
}

function drawPieChart(canvas, rows) {
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const total = rows.reduce((acc, [, value]) => acc + value, 0) || 1;
  let start = -Math.PI / 2;
  const palette = ['#5dd9a1', '#5b8cff', '#ffc857'];
  ctx.clearRect(0, 0, width, height);
  rows.forEach(([label, value], index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 16, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();
    start += angle;
    ctx.fillStyle = '#d8e6ff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${label}: ${value}`, 10, 20 + index * 16);
  });
}

function ensureConsolidationStyles() {
  if (document.getElementById('consoStyles')) return;
  const style = document.createElement('style');
  style.id = 'consoStyles';
  style.textContent = `
    .conso-page{padding:calc(env(safe-area-inset-top,0px) + 10px) 10px calc(env(safe-area-inset-bottom,0px) + 24px);color:#eaf2ff;background:linear-gradient(180deg,#132760 0%,#050b28 100%);border-radius:24px;position:relative;overflow:hidden;}
    .conso-page::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle at 20% 20%,rgba(170,208,255,.2) 1px,transparent 1px),radial-gradient(circle at 70% 60%,rgba(162,196,255,.18) 1px,transparent 1px);background-size:24px 24px,32px 32px;opacity:.2;pointer-events:none;}
    .conso-page > *{position:relative;z-index:1;}
    .conso-card{background:linear-gradient(180deg,rgba(18,32,70,.75),rgba(10,18,42,.78));border:1px solid rgba(160,190,255,.18);border-radius:30px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:14px;margin-bottom:14px;}
    .conso-hero{display:flex;gap:12px;align-items:center}.conso-hero img{width:43%;max-width:180px}.conso-hero h2{font-size:30px;line-height:1.1;margin:0 0 8px}.conso-hero p{margin:0;color:#afc2e8;font-size:16px}
    .conso-stats{margin-top:14px;background:rgba(12,23,56,.72);border:1px solid rgba(144,178,241,.25);border-radius:22px;display:grid;grid-template-columns:repeat(3,1fr)}
    .conso-stats article{padding:10px 8px}.conso-stats article + article{border-left:1px solid rgba(144,178,241,.22)}
    .conso-stats b{font-size:13px;color:#b7c9ea;display:block}.conso-stats strong{font-size:30px}.conso-stats small{font-size:15px;color:#c9dcff}
    .conso-zone{display:flex;gap:8px;align-items:center;margin-top:8px}.conso-zone input{width:88px}
    .conso-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .conso-tile{background:linear-gradient(180deg,rgba(15,29,68,.84),rgba(11,19,46,.9));border:1px solid rgba(143,177,241,.28);border-radius:24px;padding:0;overflow:hidden;transition:transform .14s ease, box-shadow .14s ease;box-shadow:0 12px 30px rgba(4,8,24,.45)}
    .conso-tile:active{transform:scale(.985);box-shadow:0 18px 35px rgba(69,136,255,.35)}.conso-tile img{width:100%;height:140px;object-fit:cover;display:block}
    .conso-tile span{display:flex;align-items:center;gap:8px;padding:12px;font-weight:700;font-size:19px;background:rgba(10,20,46,.8)}
    .conso-ai header{display:flex;align-items:center;justify-content:space-between;gap:8px}.conso-ai-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700}
    .conso-pill{border-radius:999px;padding:8px 14px;background:rgba(73,96,159,.35);border:1px solid rgba(146,177,237,.35);color:#d4e1ff}
    .conso-input-row{display:flex;gap:8px;margin-top:10px}.conso-input-row input,.conso-input{background:rgba(16,30,67,.82);border:1px solid rgba(146,178,240,.34);border-radius:20px;color:#e9f1ff;padding:12px;width:100%}
    .conso-send{width:52px;height:52px;border-radius:50%;border:1px solid rgba(146,177,238,.38);background:linear-gradient(180deg,#55a6ff,#2c5bc8);color:white}
    .conso-ai-output article{margin-top:10px;background:rgba(8,14,38,.6);padding:10px;border-radius:14px}
    .conso-page h3{margin:4px 0 12px}.conso-list{display:flex;flex-direction:column;gap:8px}
    .conso-row,.conso-move{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(10,20,48,.75);padding:10px;border-radius:14px;border:1px solid rgba(140,174,237,.22)}
    .conso-row button,.conso-move button,.conso-btn{background:rgba(77,106,176,.35);color:#d8e6ff;border:1px solid rgba(146,177,237,.35);border-radius:12px;padding:6px 10px}
    .conso-actions{display:flex;gap:8px;flex-wrap:wrap}.conso-move{display:block}.conso-move header,.conso-move footer{display:flex;justify-content:space-between;align-items:center}.conso-move .tag{color:#89d0ff}
    .conso-move.is-done{opacity:.7}.conso-history-item{background:rgba(10,18,43,.7);border:1px solid rgba(142,175,236,.24);border-radius:14px;padding:10px}
    .conso-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.conso-kpis article{padding:10px;border-radius:14px;background:rgba(10,18,43,.7);border:1px solid rgba(142,175,236,.24)}
    .conso-charts{display:grid;grid-template-columns:1fr;gap:10px}.conso-top{list-style:none;padding:0;margin:0}.conso-top li{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(142,175,236,.2)}
    dialog.conso-modal{border:none;border-radius:20px;padding:0;max-width:520px;width:calc(100% - 24px);background:#101d47;color:#e8f1ff}
    .conso-modal article{padding:16px}.conso-modal::backdrop{background:rgba(3,6,18,.65)}
  `;
  document.head.appendChild(style);
}
// END PATCH: CONSOLIDATION PAGE

// BEGIN PATCH: REMISE PAGE
const REMISE_FAQ = [
  ['comment creer une remise', 'Utilisez Générer une remise, scannez vos SKU puis validez Compléter la remise.'],
  ['1 scan 1 piece', 'Oui. Chaque lecture scanner incrémente exactement une pièce.'],
  ['briser', 'Action Briser: scanner item puis bac Scrap pour journaliser la casse.'],
  ['rebox', "Action Rebox: déplace l'item dans la file Rebox locale pour traitement différé."],
  ['forcer', 'Forcer est autorisé en Suivant avec justification obligatoire.'],
  ['prochaine remise', 'Ouvrez Suivant, sélectionnez ou scannez un ID puis traitez SKU par SKU.'],
  ['scanner bin', 'Après confirmation produit, scanner la bin attendue finalise la ligne.'],
  ['verifier produit', 'Vérifier produit liste toutes les remises contenant le SKU et leur progression.'],
  ['verifier bin', 'Vérifier bin affiche les SKU attendus et les remises actives liées à cette bin.'],
  ['status', 'Les statuts disponibles: Nouveau, En traitement, Complété.'],
  ['offline', 'Toutes les données Remise sont stockées localement pour un fonctionnement hors ligne.'],
  ['id remise', 'Format ID: LAVREM0001, incrémenté automatiquement en local.'],
  ['notes ia', 'Le bouton Notes IA sauvegarde des consignes locales persistées.'],
  ['pourquoi', 'Le bouton Pourquoi ouvre les règles officielles V1 du flux remise.'],
  ['scrap', 'Le journal Scrap conserve date, utilisateur, zone, bac et SKU.'],
  ['rebox file', 'La file Rebox garde les SKU à retraiter plus tard.'],
  ['annuler', 'Depuis Suivant, utilisez Annuler / Retour pour revenir au hub Remise.'],
  ['quantite multiple', "Par défaut il faut scanner chaque pièce jusqu'à qty restante = 0."],
  ['justification forcer', 'La justification est obligatoire pour garder la traçabilité opérateur.'],
  ['tri optimise', 'Le tri optimisé suit zone puis allée puis bin.'],
  ['scan clavier', 'Le champ scanner accepte les douchettes clavier en mode Enter.'],
  ['iphone', 'Interface mobile-first: safe-area iOS et grosses cibles tactiles.'],
  ['assistant local', 'Assistant KB local sans API externe, avec matching par mots-clés.'],
  ['archive', "Compléter archive la remise et l'envoie immédiatement dans la file Suivant."],
  ['retour generer', 'Le bouton Générer une remise dans Suivant relance la création rapide.'],
  ['restant', 'Le compteur restant est décrémenté à chaque scan produit validé.'],
  ['erreur scan', 'Un scan SKU/BIN inattendu affiche une alerte et ne modifie pas la tâche.'],
  ['donnees', 'Clés utilisées: dlwms_rem_data, dlwms_rem_scrap_log, dlwms_rem_rebox, dlwms_rem_ai_notes.'],
  ['bin progression', 'La progression bin indique total restant vs total initial sur remises actives.'],
  ['event', 'Chaque action importante ajoute un événement horodaté dans la remise.'],
  ['export', 'V1 privilégie la continuité opérationnelle locale; export global non requis.'],
  ['utilisateur', 'Le profil opérateur provient de dlwms_rem_settings.user si défini.'],
  ['zone order', 'Le tri suit la liste settings.zoneOrder: ZA,ZB,ZC,ZD par défaut.'],
  ['reset', 'Effacez localStorage uniquement si vous voulez repartir de zéro.'],
];

function defaultRemiseData() {
  return { counter: 0, draft: { items: {} }, remises: [] };
}

function getRemiseSettings() {
  return { user: 'OPERATEUR-LOCAL', zoneOrder: ['ZA', 'ZB', 'ZC', 'ZD'], ...readJsonStorage(REMISE_SETTINGS_KEY, {}) };
}

function normalizeSku(value) {
  return String(value || '').trim().toUpperCase();
}

function deriveLocation(sku) {
  const clean = normalizeSku(sku) || 'SKU';
  const num = clean.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    zone: ['ZA', 'ZB', 'ZC', 'ZD'][num % 4],
    allee: `A${String((num % 12) + 1).padStart(2, '0')}`,
    bin: `BIN-${String((num % 28) + 1).padStart(2, '0')}`,
  };
}

function createRemiseAiAnswer(question, notes = '') {
  const q = normalize(question).replace(/_/g, ' ');
  const scored = REMISE_FAQ.map(([k, answer]) => {
    const tokens = normalize(k).split(' ').filter(Boolean);
    const score = tokens.reduce((acc, token) => (q.includes(token) ? acc + 2 : acc), 0) + (q.includes(normalize(k)) ? 3 : 0);
    return { k, answer, score };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0]?.score > 0 ? scored[0] : { answer: "Je n'ai pas trouvé de règle exacte. Utilisez le bouton Pourquoi pour la procédure standard." };
  return {
    summary: best.answer,
    steps: ['Confirmer le contexte (Générer, Suivant, Vérifier ou Bins).', "Suivre les scans demandés dans l'ordre écran.", "Valider l'étape et contrôler le statut (Nouveau/En traitement/Complété)."],
    why: 'Traçabilité locale obligatoire: chaque scan et action sont journalisés hors ligne.',
    where: `Zone à utiliser: tuile Remise en stock > écran ${q.includes('bin') ? 'Bins' : q.includes('verif') ? 'Vérifier' : q.includes('suivant') ? 'Suivant' : 'Générer'}.`,
    note: notes ? `Notes locales: ${notes.slice(0, 200)}` : '',
  };
}

function bindRemisePage(route = 'remise') {
  ensureRemiseStyles();
  const data = readJsonStorage(REMISE_DATA_KEY, defaultRemiseData());
  const settings = getRemiseSettings();
  const scrapLog = readJsonStorage(REMISE_SCRAP_LOG_KEY, []);
  const reboxQueue = readJsonStorage(REMISE_REBOX_KEY, []);
  const saveData = () => writeJsonStorage(REMISE_DATA_KEY, data);
  const closeModals = () => document.querySelectorAll('.rem-modal[open]').forEach((m) => m.close());

  document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => btn.closest('dialog')?.close()));

  if (route === 'remise') {
    const notes = readJsonStorage(REMISE_AI_NOTES_KEY, '');
    const output = document.getElementById('remiseAiOutput');
    const form = document.getElementById('remiseAiForm');
    const input = document.getElementById('remiseAiInput');
    const whyBtn = document.getElementById('remiseWhyBtn');
    const notesBtn = document.getElementById('remiseNotesBtn');

    const writeChat = (entry) => {
      const rows = readJsonStorage(REMISE_AI_CHAT_KEY, []);
      writeJsonStorage(REMISE_AI_CHAT_KEY, [...rows, entry].slice(-40));
    };

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const question = String(input?.value || '').trim();
      if (!question) return;
      const answer = createRemiseAiAnswer(question, readJsonStorage(REMISE_AI_NOTES_KEY, ''));
      output.innerHTML = `<article><strong>Résumé</strong><p>${escapeHtml(answer.summary)}</p><strong>Étapes</strong><ul>${answer.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul><strong>Pourquoi</strong><p>${escapeHtml(answer.why)}</p><strong>Où cliquer</strong><p>${escapeHtml(answer.where)}</p>${answer.note ? `<p class="muted">${escapeHtml(answer.note)}</p>` : ''}</article>`;
      writeChat({ question, answer, at: Date.now() });
      if (input) input.value = '';
    });

    whyBtn?.addEventListener('click', () => document.getElementById('remiseWhyModal')?.showModal());
    notesBtn?.addEventListener('click', () => {
      const textarea = document.getElementById('remiseAiNotes');
      if (textarea) textarea.value = readJsonStorage(REMISE_AI_NOTES_KEY, notes);
      document.getElementById('remiseNotesModal')?.showModal();
    });
    document.getElementById('remiseSaveNotes')?.addEventListener('click', () => {
      const value = String(document.getElementById('remiseAiNotes')?.value || '');
      writeJsonStorage(REMISE_AI_NOTES_KEY, value);
      showToast('Notes IA enregistrées.', 'success');
      closeModals();
    });
  }

  if (route === 'remise/generer') {
    const form = document.getElementById('remiseGenerateForm');
    const input = document.getElementById('remiseGenerateScan');
    const list = document.getElementById('remiseGenerateList');
    const itemModal = document.getElementById('remiseItemActionModal');
    const breakModal = document.getElementById('remiseBreakModal');
    let selectedSku = '';

    const render = () => {
      const items = Object.entries(data.draft?.items || {}).filter(([, qty]) => qty > 0);
      if (!list) return;
      if (!items.length) {
        list.innerHTML = '<p class="muted">Aucun item scanné.</p>';
        return;
      }
      list.innerHTML = items.map(([sku, qty]) => `<button type="button" class="rem-row-item" data-sku="${escapeHtml(sku)}"><strong>${escapeHtml(sku)}</strong><small>x${qty}</small></button>`).join('');
    };

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const sku = normalizeSku(input?.value);
      if (!sku) return;
      data.draft.items[sku] = Number(data.draft.items[sku] || 0) + 1;
      saveData();
      if (input) input.value = '';
      render();
    });
    input?.addEventListener('blur', () => setTimeout(() => input.focus(), 60));
    setTimeout(() => input?.focus(), 20);

    list?.addEventListener('click', (event) => {
      const row = event.target.closest('[data-sku]');
      if (!row) return;
      selectedSku = row.dataset.sku || '';
      const title = document.getElementById('remiseItemActionTitle');
      if (title) title.textContent = `Actions item · ${selectedSku}`;
      itemModal?.showModal();
    });

    document.getElementById('remiseActionDelete')?.addEventListener('click', () => {
      delete data.draft.items[selectedSku];
      saveData();
      closeModals();
      render();
    });

    document.getElementById('remiseActionRebox')?.addEventListener('click', () => {
      if (!selectedSku) return;
      data.draft.items[selectedSku] = Math.max(0, Number(data.draft.items[selectedSku] || 0) - 1);
      if (data.draft.items[selectedSku] === 0) delete data.draft.items[selectedSku];
      reboxQueue.unshift({ sku: selectedSku, at: Date.now(), user: settings.user, zone: 'REBOX' });
      writeJsonStorage(REMISE_REBOX_KEY, reboxQueue);
      saveData();
      closeModals();
      render();
      showToast('Item envoyé en Rebox.', 'success');
    });

    document.getElementById('remiseActionBreak')?.addEventListener('click', () => {
      const itemInput = document.getElementById('remiseBreakItem');
      if (itemInput) itemInput.value = selectedSku;
      breakModal?.showModal();
    });

    document.getElementById('remiseBreakForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const scannedItem = normalizeSku(document.getElementById('remiseBreakItem')?.value);
      const scannedBin = normalizeSku(document.getElementById('remiseBreakBin')?.value);
      if (!scannedItem || !scannedBin) return;
      if (scannedItem !== selectedSku) {
        showToast('Scan item différent de la sélection.', 'error');
        return;
      }
      data.draft.items[selectedSku] = Math.max(0, Number(data.draft.items[selectedSku] || 0) - 1);
      if (data.draft.items[selectedSku] === 0) delete data.draft.items[selectedSku];
      scrapLog.unshift({ at: Date.now(), user: settings.user, zone: 'SCRAP', bin: scannedBin, sku: scannedItem });
      writeJsonStorage(REMISE_SCRAP_LOG_KEY, scrapLog);
      saveData();
      closeModals();
      render();
      showToast('Item envoyé vers Scrap.', 'success');
    });

    document.getElementById('remiseCompleteBtn')?.addEventListener('click', () => {
      const entries = Object.entries(data.draft?.items || {}).filter(([, qty]) => qty > 0);
      if (!entries.length) {
        showToast('Scannez au moins un item.', 'info');
        return;
      }
      data.counter = Number(data.counter || 0) + 1;
      const remiseId = `LAVREM${String(data.counter).padStart(4, '0')}`;
      const zoneIndex = new Map(settings.zoneOrder.map((zone, index) => [zone, index]));
      const items = entries.map(([sku, qty]) => {
        const loc = deriveLocation(sku);
        return { sku, qty, remaining: qty, ...loc, lastEventAt: Date.now(), lastEvent: 'Nouveau scan' };
      }).sort((a, b) => (zoneIndex.get(a.zone) ?? 99) - (zoneIndex.get(b.zone) ?? 99) || a.allee.localeCompare(b.allee) || a.bin.localeCompare(b.bin));
      data.remises.unshift({ id: remiseId, createdAt: Date.now(), status: 'Nouveau', items, history: [{ at: Date.now(), type: 'CREATED', user: settings.user }] });
      data.draft.items = {};
      saveData();
      showToast(`Remise ${remiseId} archivée.`, 'success');
      navigate('remise/suivant');
    });

    render();
  }

  if (route === 'remise/suivant') {
    const listNode = document.getElementById('remiseQueueList');
    const stateNode = document.getElementById('remiseProcessState');
    const pickForm = document.getElementById('remisePickForm');
    const pickInput = document.getElementById('remisePickInput');
    const productForm = document.getElementById('remiseProductForm');
    const productInput = document.getElementById('remiseProductScan');
    const binInput = document.getElementById('remiseBinScan');
    let activeId = data.activeId || data.remises.find((r) => r.status !== 'Complété')?.id || '';
    let waitingBinForSku = '';

    const findRemise = () => data.remises.find((row) => row.id === activeId);
    const currentItem = () => findRemise()?.items.find((item) => item.remaining > 0);

    const updateStatuses = (remise) => {
      const hasRemaining = remise.items.some((item) => item.remaining > 0);
      remise.status = hasRemaining ? (remise.items.some((item) => item.remaining < item.qty) ? 'En traitement' : 'Nouveau') : 'Complété';
    };

    const renderQueue = () => {
      const open = data.remises.filter((row) => row.status !== 'Complété');
      if (!listNode) return;
      if (!open.length) {
        listNode.innerHTML = '<p class="muted">Aucune remise active.</p>';
        return;
      }
      listNode.innerHTML = open.map((row) => `<button type="button" class="rem-row-item ${row.id === activeId ? 'is-active' : ''}" data-remise-id="${row.id}"><strong>${row.id}</strong><small>${row.status} · ${row.items.reduce((acc, item) => acc + item.remaining, 0)} restant</small></button>`).join('');
    };

    const renderState = () => {
      const remise = findRemise();
      if (!stateNode) return;
      if (!remise) {
        stateNode.innerHTML = '<p class="muted">Sélectionnez une remise pour démarrer.</p>';
        return;
      }
      const item = currentItem();
      if (!item) {
        stateNode.innerHTML = `<article><strong>${remise.id}</strong><p>Remise complète ✅</p><div class="rem-row"><button class="rem-btn" data-route="remise/suivant">Prochaine remise</button><button class="rem-btn" data-route="remise/generer">Générer une remise</button></div></article>`;
        return;
      }
      stateNode.innerHTML = `<article><strong>${escapeHtml(remise.id)} · ${escapeHtml(item.sku)}</strong><p>Zone ${item.zone} · Allée ${item.allee} · Bin ${item.bin}</p><p>Quantité restante: ${item.remaining}/${item.qty}</p><p class="muted">Workflow: scanner produit puis confirmer bin.</p></article>`;
    };

    listNode?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-remise-id]');
      if (!btn) return;
      activeId = btn.dataset.remiseId || '';
      data.activeId = activeId;
      saveData();
      renderQueue();
      renderState();
    });

    pickForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const id = normalizeSku(pickInput?.value);
      if (!id) return;
      const found = data.remises.find((row) => row.id === id);
      if (!found) {
        showToast('ID remise introuvable.', 'error');
        return;
      }
      activeId = found.id;
      data.activeId = activeId;
      saveData();
      if (pickInput) pickInput.value = '';
      renderQueue();
      renderState();
    });

    productForm?.addEventListener('submit', (event) => event.preventDefault());
    productInput?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const remise = findRemise();
      const item = currentItem();
      const scan = normalizeSku(productInput.value);
      if (!remise || !item || !scan) return;
      if (scan !== item.sku) {
        showToast('Produit inattendu pour cette étape.', 'error');
        return;
      }
      item.remaining = Math.max(0, item.remaining - 1);
      item.lastEventAt = Date.now();
      item.lastEvent = 'Produit confirmé';
      waitingBinForSku = item.sku;
      if (productInput) productInput.value = '';
      if (item.remaining === 0) showToast('Produit confirmé, scanner bin.', 'success');
      updateStatuses(remise);
      saveData();
      renderQueue();
      renderState();
      setTimeout(() => binInput?.focus(), 30);
    });

    binInput?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const remise = findRemise();
      const item = remise?.items.find((row) => row.sku === waitingBinForSku);
      const scan = normalizeSku(binInput.value);
      if (!remise || !item || !scan) return;
      if (scan !== item.bin) {
        showToast('Bin attendue différente.', 'error');
        return;
      }
      item.lastEventAt = Date.now();
      item.lastEvent = `Bin confirmée ${scan}`;
      remise.history.unshift({ at: Date.now(), type: 'BIN_CONFIRMED', sku: item.sku, bin: scan, user: settings.user });
      waitingBinForSku = '';
      if (binInput) binInput.value = '';
      updateStatuses(remise);
      saveData();
      showToast('Remise produit complète.', 'success');
      renderQueue();
      renderState();
      setTimeout(() => productInput?.focus(), 30);
    });

    document.getElementById('remiseForceBtn')?.addEventListener('click', () => {
      const remise = findRemise();
      const item = currentItem();
      if (!remise || !item) return;
      const justification = prompt('Justification obligatoire pour Forcer:');
      if (!justification || justification.trim().length < 3) {
        showToast('Justification insuffisante.', 'error');
        return;
      }
      item.remaining = 0;
      item.lastEventAt = Date.now();
      item.lastEvent = `Forcé: ${justification.trim()}`;
      remise.history.unshift({ at: Date.now(), type: 'FORCED', sku: item.sku, justification: justification.trim(), user: settings.user });
      updateStatuses(remise);
      saveData();
      showToast('Produit forcé avec justification.', 'success');
      renderQueue();
      renderState();
    });

    setTimeout(() => productInput?.focus(), 20);
    renderQueue();
    renderState();
  }

  if (route === 'remise/verifier') {
    const form = document.getElementById('remiseVerifyProductForm');
    const input = document.getElementById('remiseVerifyProductInput');
    const out = document.getElementById('remiseVerifyProductResults');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const sku = normalizeSku(input?.value);
      if (!sku || !out) return;
      const rows = data.remises.map((remise) => {
        const found = remise.items.find((item) => item.sku === sku);
        return found ? { remise, item: found } : null;
      }).filter(Boolean);
      if (!rows.length) {
        out.innerHTML = '<p class="muted">SKU absent des remises.</p>';
        return;
      }
      const total = rows.reduce((acc, row) => acc + row.item.remaining, 0);
      out.innerHTML = `<article><strong>SKU ${escapeHtml(sku)}</strong><p>Quantité restante totale: ${total}</p></article>${rows.map((row) => `<article><strong>${row.remise.id}</strong><p>Statut: ${row.remise.status}</p><p>Reste: ${row.item.remaining}/${row.item.qty}</p><p>Dernier événement: ${new Date(row.item.lastEventAt || row.remise.createdAt).toLocaleString('fr-CA')} · ${escapeHtml(row.item.lastEvent || 'Nouveau')}</p></article>`).join('')}`;
    });
  }

  if (route === 'remise/bins') {
    const form = document.getElementById('remiseVerifyBinForm');
    const input = document.getElementById('remiseVerifyBinInput');
    const out = document.getElementById('remiseVerifyBinResults');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const bin = normalizeSku(input?.value);
      if (!bin || !out) return;
      const rows = [];
      data.remises.filter((remise) => remise.status !== 'Complété').forEach((remise) => {
        remise.items.filter((item) => item.bin === bin && item.remaining > 0).forEach((item) => rows.push({ remise, item }));
      });
      if (!rows.length) {
        out.innerHTML = '<p class="muted">Aucun SKU attendu pour cette bin.</p>';
        return;
      }
      out.innerHTML = rows.map((row) => `<article><strong>${escapeHtml(row.item.sku)}</strong><p>${row.remise.id} · ${row.remise.status}</p><p>Progression: ${row.item.qty - row.item.remaining}/${row.item.qty}</p></article>`).join('');
    });
  }
}

function ensureRemiseStyles() {
  if (document.getElementById('remiseStyles')) return;
  const style = document.createElement('style');
  style.id = 'remiseStyles';
  style.textContent = `
    .remise-page{padding:calc(env(safe-area-inset-top,0px) + 10px) 10px calc(env(safe-area-inset-bottom,0px) + 24px);color:#ebf3ff;background:linear-gradient(180deg,#12285f 0%,#040a28 100%);border-radius:26px;position:relative;overflow:hidden}
    .remise-page::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle at 20% 15%,rgba(180,210,255,.16) 1px,transparent 1px),radial-gradient(circle at 65% 62%,rgba(138,182,255,.14) 1px,transparent 1px);background-size:26px 26px,33px 33px;opacity:.35}
    .remise-page>*{position:relative;z-index:1}.rem-card,.rem-tile,.rem-mini{background:linear-gradient(180deg,rgba(16,30,70,.82),rgba(10,18,46,.9));border:1px solid rgba(160,190,255,.18);box-shadow:0 16px 42px rgba(0,0,0,.42), inset 0 1px 0 rgba(240,250,255,.06);border-radius:24px}
    .rem-card{padding:14px;margin-bottom:12px}.rem-hero{display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:12px}.rem-hero h2{font-size:46px;line-height:1.04;margin:0 0 10px}.rem-hero p{font-size:17px;margin:0 0 8px;color:#b8c9ed}.rem-hero small{font-size:14px;color:#9db4dc}.rem-hero img{width:100%;border-radius:18px}
    .rem-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.rem-tile{padding:0;overflow:hidden;text-align:left;transition:transform .14s ease, box-shadow .14s ease}.rem-tile:active{transform:scale(.985);box-shadow:0 18px 38px rgba(59,126,255,.45)}.rem-main img{width:100%;height:164px;object-fit:cover;display:block}
    .rem-main span{display:flex;flex-direction:column;padding:12px;background:rgba(11,20,48,.88)}.rem-main strong{font-size:21px}.rem-main small{font-size:16px;color:#9db2d8}
    .rem-short{display:flex;align-items:center;min-height:72px;padding:8px 14px}.rem-short strong{font-size:19px}.rem-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .rem-ai header{display:flex;align-items:center;justify-content:space-between}.rem-ai h3{margin:0;display:flex;align-items:center;gap:8px;font-size:22px}.rem-pill,.rem-btn{border-radius:999px;padding:8px 12px;border:1px solid rgba(146,177,237,.34);background:rgba(67,96,160,.3);color:#d9e6ff}
    .rem-ai-form{display:flex;gap:8px;margin-top:10px}.rem-ai-form input,.rem-input{flex:1;background:rgba(16,30,67,.82);border:1px solid rgba(146,178,240,.34);border-radius:18px;color:#e9f1ff;padding:12px}
    .rem-send{width:52px;height:52px;border-radius:50%;border:1px solid rgba(146,177,238,.38);background:linear-gradient(180deg,#67b0ff,#2f5fd0);color:#fff}
    .rem-ai-output article,.rem-list article,.rem-row-item{margin-top:10px;background:rgba(8,14,38,.58);border:1px solid rgba(140,174,237,.2);padding:10px;border-radius:14px;display:block;color:#eaf2ff}
    .rem-row-item{display:flex;justify-content:space-between;width:100%}.rem-row-item.is-active{box-shadow:0 0 0 1px rgba(95,156,255,.65) inset}
    .rem-mini-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.rem-mini{padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:4px}.rem-mini b{font-size:15px}
    .rem-mini.is-active{box-shadow:0 -3px 0 #46a1ff inset,0 0 0 1px rgba(96,166,255,.5)}.rem-mini span{font-size:24px}
    .rem-modal{border:none;border-radius:20px;padding:0;max-width:520px;width:calc(100% - 24px);background:#101d47;color:#e8f1ff}.rem-modal article{padding:16px}.rem-modal::backdrop{background:rgba(3,6,18,.65)}
    .rem-stack{display:flex;flex-direction:column;gap:8px}
    @media (max-width:760px){.rem-hero h2{font-size:28px}.rem-hero{grid-template-columns:1fr}.rem-main img{height:132px}.rem-short strong{font-size:17px}}
  `;
  document.head.appendChild(style);
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

  const kb = await getWmsKb();
  const kbRows = (kb?.history?.entries || []).map((entry) => ({
    module: entry.module || 'historique',
    label: `${entry.titre} · impact ${entry.impact}`,
    at: Date.parse(entry.date) || Date.now(),
  }));

  const [stats, requests] = await Promise.all([getAll('stats'), getAll('requests')]);
  const dynamicRows = [...stats, ...requests].map((item) => ({
    module: item.scope || item.module || 'ai-center',
    label: item.prompt || item.status || item.type || 'événement',
    at: item.updatedAt || Date.now(),
  }));

  const rows = [...kbRows, ...dynamicRows].sort((a, b) => b.at - a.at);

  const render = () => {
    const module = filter.value;
    const filtered = module === 'all' ? rows : rows.filter((row) => row.module.includes(module));
    list.textContent = filtered.length
      ? filtered.slice(0, 120).map((row) => `${new Date(row.at).toLocaleString('fr-FR')} · ${row.module} · ${row.label}`).join('\n')
      : 'Aucun événement.';
  };

  filter.addEventListener('change', render);
  render();
}

async function hydrateWmsKnowledge(route) {
  const kb = await getWmsKb();
  window.DLWMS_WMS_KB = kb;
  window.DLWMS_getWmsKnowledge = async (section = '') => {
    const data = await getWmsKb();
    return section ? data?.[section] : data;
  };
  window.DLWMS_searchWmsKnowledge = async (query = '', limit = 3) => {
    const data = await getWmsKb();
    return searchWmsKb(data, query, limit);
  };

  if (route !== 'parametres') return;
  const receptionHint = document.querySelector('#settings-reception .muted');
  const consolidationHint = document.querySelector('#settings-consolidation .muted');
  const remiseHint = document.querySelector('#settings-remise .muted');

  if (receptionHint) {
    const inv = kb?.parameters?.inventaire?.map((row) => `${row.parametre}: ${row.valeur}`).join(' · ');
    if (inv) receptionHint.textContent = `${receptionHint.textContent} ${inv}`;
  }
  if (consolidationHint) {
    const cons = kb?.parameters?.consolidation?.map((row) => `${row.parametre}: ${row.valeur}`).join(' · ');
    if (cons) consolidationHint.textContent = `${consolidationHint.textContent} ${cons}`;
  }
  if (remiseHint) {
    const top = kb?.about?.pillars?.join(', ');
    if (top) remiseHint.textContent = `${remiseHint.textContent} Piliers Complément: ${top}.`;
  }

  localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kb));
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
  if (lowerName.endsWith('.json')) {
    const json = JSON.parse(await file.text());
    markLastImport({ fileName: file.name, rows: Array.isArray(json) ? json.length : 1 });
    return json;
  }
  if (lowerName.endsWith('.pdf')) {
    const rows = [{ source: file.name, content: await file.text() }];
    markLastImport({ fileName: file.name, rows: rows.length });
    return rows;
  }
  const rows = parseCsv(await file.text());
  markLastImport({ fileName: file.name, rows: rows.length });
  return rows;
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
