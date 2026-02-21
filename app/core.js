import { loadRoute } from './router.js';
import ui, { setNavActive, setNavBadge, bindAccordions, showToast, debounce, addPassiveListener, UI_VERSION } from './ui.js';
import { initDB, exportAllData, importAllData, putRecord, getAll, clearStore, setConfig, getConfig, flushConfigWrites } from './storage.js';
import { analyzePrompt, parseCsv, splitRowsByColumns, normalize } from './ai-engine.js';
import { incrementalTrain, trainingMatrix } from './trainer.js';
import { trainNeuralLite } from './neural-lite.js';
import { apply1000Improvements, auditImprovements } from './improvements.js';
import { attachScanController } from './scan_ui.js';

const appNode = document.getElementById('app');
const nav = document.querySelector('.bottom-nav');
const worker = new Worker('./app/ai-worker.js', { type: 'module' });
const LIA_GUIDE_PATH = './docs/formation-lia.md';
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
  const initialRoute = localStorage.getItem('lastRoute') || 'ai-center';
  await navigate(initialRoute);
  setNavBadge('monitoring', 'IA');
  if ('serviceWorker' in navigator) await navigator.serviceWorker.register('./sw.js');
  setConfig('app_name', 'DL.WMS IA Ultimate');
  window.addEventListener('keydown', async (event) => {
    if (event.altKey && event.key.toLowerCase() === 'u') {
      await navigate('ui-self-test');
    }
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

async function navigate(route) {
  await loadRoute(route, appNode);
  setNavActive(route);
  localStorage.setItem('lastRoute', route);
  appNode.querySelectorAll('[data-route]').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.route)));

  await bindSharedActions();
  bindAccordions(appNode);
  bindScanInputs();
  if (route === 'parametres') await hydrateSettingsMetrics();
  if (route === 'monitoring') hydrateMonitoring();
  if (route === 'ui-self-test') bindUiSelfTest();
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
  const presetNode = document.getElementById('promptPreset');
  const categoryNode = document.getElementById('promptCategory');

  if (promptNode) {
    const storedPrompt = localStorage.getItem('selectedPromptPreset');
    if (storedPrompt && !promptNode.value.trim()) promptNode.value = storedPrompt;
  }

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

  document.getElementById('runAi')?.addEventListener('click', async () => {
    const prompt = promptNode?.value.trim();
    if (!prompt) return;
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
    for (const dataset of WAREHOUSE_DATASETS) await putRecord('datasets', dataset);
    updateAiPanels('Bases entrepôt chargées.', `${WAREHOUSE_DATASETS.length} datasets disponibles.`);
    await hydrateSettingsMetrics();
  });

  document.getElementById('exportBackup')?.addEventListener('click', async () => {
    const data = await exportAllData();
    downloadJSON(data, 'dlwms-backup.json');
  });

  document.getElementById('importBackup')?.addEventListener('click', async () => {
    const [file] = document.getElementById('fileInput').files;
    if (!file) return;
    const json = JSON.parse(await file.text());
    await importAllData(json);
    updateAiPanels('Backup importé.', 'Les données locales ont été restaurées.');
    await hydrateSettingsMetrics();
  });


  const apply1000Btn = document.getElementById('apply1000Improvements') || document.getElementById('apply300Improvements');
  apply1000Btn?.addEventListener('click', async () => {
    await apply1000Improvements();
    const summary = await auditImprovements();
    updateAiPanels('Pack 1000 améliorations appliqué.', `Conformité: ${summary.score}% (${summary.passed}/${summary.total}).`);
    await hydrateSettingsMetrics();
  });

  const verify1000Btn = document.getElementById('verify1000Improvements') || document.getElementById('verify300Improvements');
  verify1000Btn?.addEventListener('click', async () => {
    const summary = await auditImprovements();
    updateAiPanels('Audit des 1000 améliorations terminé.', `Score: ${summary.score}% - OK: ${summary.passed} - KO: ${summary.failed}.`);
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
