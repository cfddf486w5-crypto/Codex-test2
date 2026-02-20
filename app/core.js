import { loadRoute } from './router.js';
import { initDB, exportAllData, importAllData, putRecord, getAll, clearStore, setConfig, getConfig } from './storage.js';
import { analyzePrompt, parseCsv, splitRowsByColumns, normalize, getPerformanceSnapshot } from './ai-engine.js';
import { incrementalTrain, trainingMatrix } from './trainer.js';
import { trainNeuralLite } from './neural-lite.js';

const appNode = document.getElementById('app');
const nav = document.querySelector('.bottom-nav');
const worker = new Worker('./app/ai-worker.js', { type: 'module' });
let deferredPrompt;
let lastDecisionId;
let continuousTrainingTimer;
let continuousTrainingIndex = 0;

const WAREHOUSE_PROMPT_PRESETS = [
  { label: '01 · Lecture simple Excel', prompt: 'Lis le fichier Excel Recettes.xlsx et résume les 10 premières lignes avec les colonnes Date, Produit et Montant.' },
  { label: '02 · Vérification colonnes', prompt: 'Vérifie que le document Excel Ventes.xlsx contient les colonnes Client, Quantité, Prix unitaire et Total.' },
  { label: '03 · Nettoyage doublons', prompt: 'Supprime les lignes en doublon dans Inventaire.xlsx en te basant sur la colonne SKU puis donne le nombre supprimé.' },
  { label: '04 · Valeurs manquantes', prompt: 'Détecte les cellules vides dans RH.xlsx, propose une correction automatique et liste les anomalies.' },
  { label: '05 · Ecriture commentaire', prompt: 'Écris une colonne Commentaire dans Qualite.xlsx indiquant Conforme ou À contrôler selon la note qualité.' },
  { label: '06 · Calcul TVA', prompt: 'Calcule la TVA à 20% dans Factures.xlsx et écris le résultat dans la colonne TVA puis TTC.' },
  { label: '07 · Marge commerciale', prompt: 'Calcule la marge en pourcentage sur chaque ligne de AchatsVentes.xlsx puis classe du plus rentable au moins rentable.' },
  { label: '08 · Tri priorités', prompt: 'Trie les commandes de Commandes.xlsx par Urgence puis par Date limite et retourne le top 15.' },
  { label: '09 · Filtre régional', prompt: 'Filtre les données de Prospects.xlsx pour ne garder que la région Île-de-France et exporte un résumé.' },
  { label: '10 · Consolidation multi-feuilles', prompt: 'Fusionne toutes les feuilles du fichier Stocks_Mensuels.xlsx dans une table unique normalisée.' },
  { label: '11 · Tableau croisé', prompt: 'Crée un tableau croisé de Ventes2026.xlsx par Commercial et Mois avec Somme CA et Nombre commandes.' },
  { label: '12 · Prévision simple', prompt: 'Sur BaseDemandes.xlsx, calcule une tendance hebdomadaire et propose une prévision sur 4 semaines.' },
  { label: '13 · Contrôle incohérences', prompt: 'Repère les lignes où Quantité * Prix unitaire est différent de Total dans Audit.xlsx.' },
  { label: '14 · Normalisation dates', prompt: 'Convertis toutes les dates de Planning.xlsx au format AAAA-MM-JJ puis valide les erreurs.' },
  { label: '15 · Mapping colonnes', prompt: 'Associe les colonnes de ImportERP.xlsx vers le schéma cible CodeArticle, Libellé, Stock, Emplacement.' },
  { label: '16 · Détection fraude', prompt: 'Analyse Remboursements.xlsx et signale les montants anormaux supérieurs à 2 écarts-types.' },
  { label: '17 · Score client', prompt: 'Crée un score client de 0 à 100 dans CRM.xlsx selon fréquence, panier moyen et retard paiement.' },
  { label: '18 · Ecriture automatique', prompt: 'Écris dans Relances.xlsx une action recommandée pour chaque client: appeler, emailer ou surveiller.' },
  { label: '19 · Calcul stock sécurité', prompt: 'Calcule le stock de sécurité dans Approvisionnement.xlsx selon consommation moyenne et délai fournisseur.' },
  { label: '20 · KPI logistique', prompt: 'Calcule taux de service, taux de rupture et délai moyen dans PerformanceLog.xlsx.' },
  { label: '21 · Lecture facture PDF->Excel', prompt: 'Lis les données extraites dans FacturesOCR.xlsx et crée un journal comptable prêt à importer.' },
  { label: '22 · Détection unités', prompt: 'Uniformise les unités kg, g, tonne dans MatièresPremières.xlsx et recalcule les quantités.' },
  { label: '23 · Contrôle seuils', prompt: 'Marque en rouge logique les lignes où le stock est sous seuil critique dans StockAlerte.xlsx.' },
  { label: '24 · Classe ABC', prompt: 'Réalise une classification ABC des articles dans RotationStock.xlsx à partir du CA cumulé.' },
  { label: '25 · Optimisation picking', prompt: 'Propose un ordre de picking optimisé pour OrdresPicking.xlsx en minimisant la distance.' },
  { label: '26 · Détection retards', prompt: 'Calcule les retards fournisseurs dans Receptions.xlsx et écris un champ Niveau de risque.' },
  { label: '27 · Réconciliation bases', prompt: 'Compare Donnees_WMS.xlsx et Donnees_ERP.xlsx et liste les écarts de stock par SKU.' },
  { label: '28 · Formules dynamiques', prompt: 'Insère automatiquement des formules SOMME.SI.ENS dans Budget.xlsx selon centre de coût.' },
  { label: '29 · Segmenter clients', prompt: 'Segmente Clients.xlsx en Premium, Standard, Dormant selon CA annuel et dernière commande.' },
  { label: '30 · Export réponse', prompt: 'Lis Q_A_Interne.xlsx, réponds aux questions fréquentes et écris les réponses dans la colonne Réponse IA.' },
  { label: '31 · Analyse RH', prompt: 'Calcule le taux d’absentéisme mensuel dans Equipes.xlsx et identifie les services les plus exposés.' },
  { label: '32 · Détection erreurs saisie', prompt: 'Détecte les anomalies de saisie dans SaisieManuelle.xlsx: codes invalides, dates impossibles, montants négatifs.' },
  { label: '33 · Calcul commissions', prompt: 'Calcule les commissions commerciales dans Commissions.xlsx selon paliers de performance.' },
  { label: '34 · Fusion clients doublons', prompt: 'Fusionne les clients en doublon dans BaseClients.xlsx via email + téléphone et garde la fiche la plus récente.' },
  { label: '35 · Réponse automatique', prompt: 'Lis les colonnes Problème et Priorité de Tickets.xlsx puis écris une réponse standard adaptée.' },
  { label: '36 · Analyse énergétique', prompt: 'Calcule la consommation moyenne par site dans Energie.xlsx et préviens si variation > 15%.' },
  { label: '37 · Simulation capacité', prompt: 'Simule la capacité d’entrepôt sur Capacité.xlsx et indique les zones saturées à J+7.' },
  { label: '38 · Planification équipes', prompt: 'Optimise le planning de EquipesLog.xlsx selon charge estimée et contraintes horaires.' },
  { label: '39 · Contrôle budget', prompt: 'Compare Réel vs Budget dans Finance.xlsx et explique les 5 plus gros écarts.' },
  { label: '40 · Synthèse finale', prompt: 'Génère un rapport final lisible pour direction à partir de toutes les feuilles Excel, avec actions prioritaires.' },
];

const LIA_GUIDE_PATH = './docs/formation-lia.md';

const WAREHOUSE_DATASETS = [
  {
    name: 'warehouse-receptions',
    rows: 4,
    sample: [
      { dock: 'D1', supplier: 'NordFrais', etaMin: 18, pallets: 24, priority: 'high' },
      { dock: 'D3', supplier: 'TransLog', etaMin: 50, pallets: 12, priority: 'medium' },
      { dock: 'D2', supplier: 'EcoStock', etaMin: 35, pallets: 19, priority: 'high' },
      { dock: 'D4', supplier: 'PrimeRoute', etaMin: 70, pallets: 9, priority: 'low' },
    ],
  },
  {
    name: 'warehouse-inventory',
    rows: 4,
    sample: [
      { sku: 'SKU-4512', zone: 'A-03', expected: 120, counted: 109, delta: -11 },
      { sku: 'SKU-0821', zone: 'B-10', expected: 64, counted: 72, delta: 8 },
      { sku: 'SKU-7788', zone: 'C-02', expected: 48, counted: 33, delta: -15 },
      { sku: 'SKU-9031', zone: 'D-07', expected: 200, counted: 198, delta: -2 },
    ],
  },
  {
    name: 'warehouse-orders',
    rows: 4,
    sample: [
      { orderId: 'CMD-1001', route: ['A-01', 'A-04', 'B-02'], lines: 9, slaMin: 45 },
      { orderId: 'CMD-1002', route: ['C-03', 'C-01', 'D-06'], lines: 4, slaMin: 30 },
      { orderId: 'CMD-1003', route: ['B-09', 'A-02', 'B-01'], lines: 7, slaMin: 40 },
      { orderId: 'CMD-1004', route: ['D-04', 'D-02', 'C-07'], lines: 10, slaMin: 60 },
    ],
  },
];

async function boot() {
  await initDB();
  bindInstall();
  bindNav();
  await navigate('dashboard');
  if ('serviceWorker' in navigator) await navigator.serviceWorker.register('./sw.js');
  setConfig('app_name', 'DL.WMS IA Ultimate');
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
    if (!button) return;
    await navigate(button.dataset.route);
  });
}

async function navigate(route) {
  await loadRoute(route, appNode);
  document.querySelectorAll('.bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
  appNode.querySelectorAll('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  if (route === 'dashboard') await hydrateDashboard();
  if (route === 'ai-center') bindAiCenter();
}

async function hydrateDashboard() {
  const stats = await getPerformanceSnapshot();
  const anomalies = (await getAll('stats')).filter((s) => s.type === 'anomaly').length;
  const dist = getConfig('last_distance', 0);
  document.getElementById('kpiDecisions').textContent = String(stats.total);
  document.getElementById('kpiAnomalies').textContent = String(anomalies);
  document.getElementById('kpiSuccess').textContent = `${stats.successRate}%`;
  document.getElementById('kpiDistance').textContent = `${dist}m`;
}

function bindAiCenter() {
  const reasoningNode = document.getElementById('aiReasoning');
  const scoreNode = document.getElementById('aiScore');
  const promptNode = document.getElementById('aiPrompt');
  const presetNode = document.getElementById('promptPreset');

  presetNode.innerHTML = '<option value="">Sélectionner un prompt métier...</option>';
  for (const preset of WAREHOUSE_PROMPT_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.prompt;
    option.textContent = preset.label;
    presetNode.append(option);
  }

  const trainingStatusNode = document.getElementById('liaTrainingStatus');

  document.getElementById('usePromptPreset').addEventListener('click', () => {
    if (!presetNode.value) return;
    promptNode.value = presetNode.value;
    reasoningNode.textContent = 'Prompt pré-enregistré injecté dans la zone de saisie.';
  });

  document.getElementById('loadLiaPrompts').addEventListener('click', async () => {
    await putRecord('datasets', {
      name: 'lia-training-prompts',
      rows: WAREHOUSE_PROMPT_PRESETS.length,
      sample: WAREHOUSE_PROMPT_PRESETS,
      createdAt: new Date().toISOString(),
    });
    promptNode.value = WAREHOUSE_PROMPT_PRESETS[0]?.prompt || '';
    reasoningNode.textContent = `Programme chargé: ${WAREHOUSE_PROMPT_PRESETS.length} prompts de formation LIA disponibles.`;
  });

  document.getElementById('openLiaGuide').addEventListener('click', () => {
    window.open(LIA_GUIDE_PATH, '_blank', 'noopener');
  });
  document.getElementById('runAi').addEventListener('click', async () => {
    const prompt = document.getElementById('aiPrompt').value.trim();
    if (!prompt) return;
    await putRecord('requests', { channel: 'text', prompt, status: 'received' });
    const moves = [{ distance: 12 }, { distance: 8 }, { distance: 7 }];
    worker.postMessage({ type: 'batch-distance', payload: { moves } });
    worker.onmessage = async ({ data }) => {
      if (data.type === 'batch-distance') setConfig('last_distance', data.total);
      const decision = await analyzePrompt(prompt, { moves, history: await getAll('stats') });
      lastDecisionId = decision.id;
      reasoningNode.textContent = decision.reasoning;
      scoreNode.textContent = `Score décision: ${decision.score}`;
    };
  });

  document.getElementById('fileInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      const parsed = await parseImportFile(file);
      const rows = Array.isArray(parsed) ? parsed : [];
      const byColumn = splitRowsByColumns(rows);

      await putRecord('datasets', { name: file.name, rows: rows.length || 0, sample: rows.slice?.(0, 5) || parsed });
      if (rows.length) {
        await putRecord('excelRows', { source: file.name, rows });
        await putRecord('excelColumns', {
          source: file.name,
          columns: Object.entries(byColumn).map(([name, values]) => ({ name, values })),
        });
      }
    }
    reasoningNode.textContent = 'Fichiers importés, séparés par colonnes et enregistrés dans de nouveaux tableaux (excelRows / excelColumns).';
  });

  document.getElementById('extractExcel').addEventListener('click', async () => {
    const rowsTables = await getAll('excelRows');
    const columnsTables = await getAll('excelColumns');
    const rowCount = rowsTables.reduce((sum, table) => sum + ((table.rows || []).length || 0), 0);
    const columnCount = columnsTables.reduce((sum, table) => sum + ((table.columns || []).length || 0), 0);
    reasoningNode.textContent = `Analyse Excel terminée: ${rowCount} lignes traitées et ${columnCount} colonnes séparées.`;
  });

  document.getElementById('loadWarehouseData').addEventListener('click', async () => {
    for (const dataset of WAREHOUSE_DATASETS) await putRecord('datasets', dataset);
    reasoningNode.textContent = `Bases de données entrepôt chargées (${WAREHOUSE_DATASETS.length} datasets).`;
  });

  document.getElementById('correctPositive').addEventListener('click', () => setFeedback(true));
  document.getElementById('correctNegative').addEventListener('click', () => setFeedback(false));

  async function setFeedback(success) {
    if (!lastDecisionId) return;
    await putRecord('stats', { type: 'feedback', success, decisionId: lastDecisionId });
    await incrementalTrain({ success, weightDelta: 0.04 });
    reasoningNode.textContent += `\nFeedback enregistré: ${success ? 'positif' : 'négatif'}.`;
  }

  document.getElementById('addRule').addEventListener('click', async () => {
    const txt = document.getElementById('customRule').value.trim();
    if (!txt) return;
    await putRecord('rules', { text: txt, priority: 1 });
    reasoningNode.textContent = `Règle ajoutée: ${txt}`;
  });

  document.getElementById('loadDataset').addEventListener('click', async () => {
    const sample = [
      { x: [0.3, 0.4, 0.2, 0.1], y: 1 },
      { x: [0.1, 0.2, 0.8, 0.5], y: 0 },
      { x: [0.8, 0.1, 0.2, 0.3], y: 1 },
    ];
    await putRecord('datasets', { name: 'sample-neural', rows: sample.length, sample });
    reasoningNode.textContent = 'Dataset exemple chargé.';
  });

  document.getElementById('runTraining').addEventListener('click', async () => {
    const datasets = await getAll('datasets');
    const sample = datasets.find((d) => d.name === 'sample-neural')?.sample || [];
    const weights = trainNeuralLite(sample);
    const matrix = trainingMatrix(Math.max(8, sample.length * 4));
    document.getElementById('matrixOutput').textContent = `Poids: ${JSON.stringify(weights)}\nMatrice: ${JSON.stringify(matrix, null, 2)}`;
  });


  document.getElementById('startContinuousTraining').addEventListener('click', async () => {
    if (continuousTrainingTimer) return;
    trainingStatusNode.textContent = 'Formation continue active (1 prompt / 5 secondes).';
    continuousTrainingTimer = setInterval(async () => {
      const currentPreset = WAREHOUSE_PROMPT_PRESETS[continuousTrainingIndex % WAREHOUSE_PROMPT_PRESETS.length];
      continuousTrainingIndex += 1;
      promptNode.value = currentPreset.prompt;
      await putRecord('requests', { channel: 'continuous-training', prompt: currentPreset.prompt, status: 'trained' });
      await incrementalTrain({ success: true, weightDelta: 0.01 });
      reasoningNode.textContent = `Formation continue en cours... Prompt ${continuousTrainingIndex}/${WAREHOUSE_PROMPT_PRESETS.length}: ${currentPreset.label}`;
      scoreNode.textContent = `Score décision: entraînement automatique (${continuousTrainingIndex})`;
    }, 5000);
  });

  document.getElementById('stopContinuousTraining').addEventListener('click', () => {
    if (!continuousTrainingTimer) return;
    clearInterval(continuousTrainingTimer);
    continuousTrainingTimer = null;
    trainingStatusNode.textContent = 'Formation continue stoppée.';
  });

  document.getElementById('resetLearning').addEventListener('click', async () => {
    for (const store of ['rules', 'weights', 'vectors', 'decisions', 'stats', 'thresholds']) await clearStore(store);
    setConfig('nn_weights', [0.5, -0.2, 0.8, 0.3]);
    reasoningNode.textContent = 'Apprentissage réinitialisé.';
  });

  document.getElementById('exportModel').addEventListener('click', async () => {
    const model = { nn: getConfig('nn_weights', []), rules: await getAll('rules'), weights: await getAll('weights') };
    downloadJSON(model, 'dlwms-model.json');
  });

  document.getElementById('retrainBtn').addEventListener('click', async () => {
    await incrementalTrain({ success: true, weightDelta: 0.02 });
    reasoningNode.textContent += '\nMicro-réentraînement exécuté.';
  });

  document.getElementById('exportBackup').addEventListener('click', async () => {
    const data = await exportAllData();
    downloadJSON(data, 'dlwms-backup.json');
  });

  document.getElementById('importBackup').addEventListener('click', async () => {
    const [file] = document.getElementById('fileInput').files;
    if (!file) return;
    const json = JSON.parse(await file.text());
    await importAllData(json);
    reasoningNode.textContent = 'Backup importé.';
  });

  document.getElementById('runVoiceCommand').addEventListener('click', async () => {
    const voiceInputNode = document.getElementById('voicePrompt');
    const command = voiceInputNode.value.trim();
    if (!command) return;

    const normalizedCommand = normalize(command);
    const commandId = await putRecord('voiceCommands', {
      raw: command,
      normalized: normalizedCommand,
      status: 'received',
    });

    if (normalizedCommand.includes('archive la palette')) {
      await putRecord('palettes', {
        label: `Palette ${new Date().toLocaleTimeString('fr-FR')}`,
        status: 'archived',
        archivedBy: 'voice-command',
      });
      await putRecord('voiceCommands', {
        id: commandId,
        raw: command,
        normalized: normalizedCommand,
        status: 'executed',
        action: 'archive_palette',
      });
      reasoningNode.textContent = 'Commande vocale exécutée: la palette a été archivée.';
    } else {
      await putRecord('voiceCommands', {
        id: commandId,
        raw: command,
        normalized: normalizedCommand,
        status: 'ignored',
      });
      reasoningNode.textContent = 'Commande vocale enregistrée en base, mais aucune action correspondante n\'a été trouvée.';
    }
  });
}

async function parseImportFile(file) {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.json')) return JSON.parse(await file.text());
  if (lowerName.endsWith('.xlsx')) {
    const fallbackText = await file.text();
    return parseCsv(fallbackText);
  }
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

boot();
