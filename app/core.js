import { loadRoute } from './router.js';
import { initDB, exportAllData, importAllData, putRecord, getAll, clearStore, setConfig, getConfig } from './storage.js';
import { analyzePrompt, parseCsv, getPerformanceSnapshot } from './ai-engine.js';
import { incrementalTrain, trainingMatrix } from './trainer.js';
import { trainNeuralLite } from './neural-lite.js';

const appNode = document.getElementById('app');
const nav = document.querySelector('.bottom-nav');
const worker = new Worker('./app/ai-worker.js', { type: 'module' });
let deferredPrompt;
let lastDecisionId;

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

  document.getElementById('runAi').addEventListener('click', async () => {
    const prompt = document.getElementById('aiPrompt').value.trim();
    if (!prompt) return;
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
      const content = await file.text();
      const parsed = file.name.endsWith('.csv') ? parseCsv(content) : JSON.parse(content);
      await putRecord('datasets', { name: file.name, rows: parsed.length || 0, sample: parsed.slice?.(0, 5) || parsed });
    }
    reasoningNode.textContent = 'Fichiers importés en base locale.';
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
