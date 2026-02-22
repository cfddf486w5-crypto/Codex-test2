import { initStore, putEntity } from './ai_store.js';
import { askAi, saveChatTurn, saveFeedback } from './ai_engine.js';
import { addRule, addFaq, addSop, SITE_OPTIONS } from './ai_knowledge.js';
import { importFiles } from './ai_import.js';
import { exportFeedbackDataset, exportKnowledgeJson, exportRulesFaqCsv } from './ai_export.js';
import { getPrivacyMode, setPrivacyMode, PRIVACY_MODE } from './ai_privacy.js';
import { toCsv, exportMovementPdf } from './ai_tools.js';

const QUICK = ['Items < 20', 'Générer déplacements', 'Expliquer une règle', 'Créer une règle métier', 'Importer connaissances', 'Exporter knowledge + dataset'];

function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (html) node.innerHTML = html;
  return node;
}

function downloadText(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function onAsk(input, messages) {
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  const qNode = el('div', { class: 'ai-msg user' }, q);
  messages.append(qNode);

  const answer = await askAi(q);
  const content = `${answer.summary}<br><small>${(answer.details || []).join('<br>')}</small>`;
  const aNode = el('div', { class: 'ai-msg assistant' }, content);

  const actions = el('div', { class: 'ai-actions' });
  (answer.actions || []).forEach((action) => {
    const btn = el('button', { class: 'ghost btn-xs' }, action);
    btn.addEventListener('click', () => {
      if (action === 'copy') navigator.clipboard?.writeText(`${answer.summary}\n${(answer.details || []).join('\n')}`);
      if (action === 'export_csv' && answer.payload) downloadText('deplacements.csv', toCsv(answer.payload), 'text/csv');
      if (action === 'export_pdf' && answer.payload) window.open(exportMovementPdf(answer.payload), '_blank');
    });
    actions.append(btn);
  });
  aNode.append(actions);

  const fb = el('div', { class: 'ai-actions' });
  const up = el('button', { class: 'ghost btn-xs' }, '👍 utile');
  up.addEventListener('click', async () => { await saveFeedback({ question: q, aiAnswer: answer.summary, helpful: true }); up.textContent = '✅ Merci'; });
  const down = el('button', { class: 'warn btn-xs' }, '👎 faux');
  down.addEventListener('click', async () => {
    const correction = prompt('Correction attendue');
    if (!correction) return;
    const why = prompt('Pourquoi ?') || '';
    const markAsRule = confirm('Marquer aussi comme règle métier ?');
    await saveFeedback({ question: q, aiAnswer: answer.summary, helpful: false, correction, why, markAsRule });
    if (markAsRule) await addRule({ title: `Règle issue feedback: ${q.slice(0, 42)}`, description: correction, tags: ['feedback'] });
    down.textContent = '✅ Corrigé';
  });
  fb.append(up, down);
  aNode.append(fb);

  messages.append(aNode);
  messages.scrollTop = messages.scrollHeight;
  await saveChatTurn(q, answer.summary);
}

async function bindKnowledgeModal(root) {
  const formRule = root.querySelector('#aiRuleForm');
  const formFaq = root.querySelector('#aiFaqForm');
  const formSop = root.querySelector('#aiSopForm');
  const inputFiles = root.querySelector('#aiImportFiles');

  formRule?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formRule);
    await addRule({
      title: fd.get('title'),
      description: fd.get('description'),
      example: fd.get('example'),
      tags: String(fd.get('tags') || '').split(',').map((x) => x.trim()).filter(Boolean),
      priority: fd.get('priority'),
      sites: fd.getAll('sites'),
      date: fd.get('date'),
    });
    formRule.reset();
    alert('Règle ajoutée');
  });

  formFaq?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formFaq);
    await addFaq({ question: fd.get('question'), answer: fd.get('answer'), tags: String(fd.get('tags') || '').split(',') });
    formFaq.reset();
    alert('FAQ ajoutée');
  });

  formSop?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formSop);
    await addSop({ title: fd.get('title'), steps: String(fd.get('steps') || '').split('\n').filter(Boolean) });
    formSop.reset();
    alert('SOP ajoutée');
  });

  inputFiles?.addEventListener('change', async () => {
    const results = await importFiles(Array.from(inputFiles.files || []));
    alert(results.map((r) => `${r.name}: ${r.ok ? 'OK' : r.reason}`).join('\n'));
  });

  root.querySelector('#aiDatasetInventory')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = new TextDecoder('utf-8').decode(await file.arrayBuffer());
    await putEntity('datasets', { kind: 'inventory', name: file.name, text });
    alert('Inventaire importé');
  });

  root.querySelector('#aiDatasetReception')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = new TextDecoder('utf-8').decode(await file.arrayBuffer());
    await putEntity('datasets', { kind: 'reception', name: file.name, text });
    alert('Réception importée');
  });
}

export async function initAiUi() {
  await initStore();
  const panel = el('aside', { class: 'ai-panel', id: 'aiPanel' });
  panel.innerHTML = `
    <button id="aiToggle" class="primary">🤖 IA</button>
    <section class="ai-drawer" id="aiDrawer">
      <header><strong>Assistant IA DL WMS</strong></header>
      <div class="row"><label>Mode IA</label><select id="aiMode"><option value="offline">Offline</option><option value="hybrid">Hybride</option></select></div>
      <div class="ai-quick" id="aiQuick"></div>
      <div class="ai-messages" id="aiMessages"></div>
      <div class="row"><input id="aiInput" placeholder="Posez une question métier" /><button id="aiSend">Envoyer</button></div>
      <details><summary>Connaissances</summary>
        <form id="aiRuleForm" class="stack">
          <input name="title" placeholder="Titre règle" required />
          <textarea name="description" placeholder="Description" required></textarea>
          <input name="example" placeholder="Exemple" />
          <input name="tags" placeholder="Tags (a,b,c)" />
          <select name="priority"><option>Haute</option><option selected>Moyenne</option><option>Basse</option></select>
          <div>${SITE_OPTIONS.map((s) => `<label><input type="checkbox" name="sites" value="${s}" />${s}</label>`).join('')}</div>
          <input type="date" name="date" />
          <button>Ajouter règle</button>
        </form>
        <form id="aiSopForm" class="stack"><input name="title" placeholder="Titre SOP" required /><textarea name="steps" placeholder="Étapes, une par ligne"></textarea><button>Ajouter SOP</button></form>
        <form id="aiFaqForm" class="stack"><input name="question" placeholder="Question" required /><textarea name="answer" placeholder="Réponse" required></textarea><input name="tags" placeholder="Tags" /><button>Ajouter FAQ</button></form>
        <label>Importer docs<input id="aiImportFiles" type="file" multiple /></label>
        <label>Dataset inventaire (CSV)<input id="aiDatasetInventory" type="file" accept=".csv" /></label>
        <label>Dataset réception (CSV)<input id="aiDatasetReception" type="file" accept=".csv" /></label>
      </details>
      <div class="row"><button id="aiExportAll">Exporter knowledge + dataset</button><button id="aiExportCsv">Exporter CSV règles/FAQ</button></div>
    </section>`;
  document.body.append(panel);

  const drawer = panel.querySelector('#aiDrawer');
  panel.querySelector('#aiToggle').addEventListener('click', () => drawer.classList.toggle('open'));

  const mode = panel.querySelector('#aiMode');
  mode.value = await getPrivacyMode();
  mode.addEventListener('change', () => setPrivacyMode(mode.value));

  const input = panel.querySelector('#aiInput');
  const messages = panel.querySelector('#aiMessages');
  panel.querySelector('#aiSend').addEventListener('click', () => onAsk(input, messages));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAsk(input, messages); });

  const quickWrap = panel.querySelector('#aiQuick');
  QUICK.forEach((txt) => {
    const b = el('button', { class: 'ghost btn-xs' }, txt);
    b.addEventListener('click', () => { input.value = txt; onAsk(input, messages); });
    quickWrap.append(b);
  });

  panel.querySelector('#aiExportAll').addEventListener('click', async () => {
    await exportKnowledgeJson();
    await exportFeedbackDataset();
  });
  panel.querySelector('#aiExportCsv').addEventListener('click', exportRulesFaqCsv);

  bindKnowledgeModal(panel);
}

initAiUi();
