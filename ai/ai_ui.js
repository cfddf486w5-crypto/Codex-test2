import { initStore } from './ai_store.js';
import { askAi, saveChatTurn, saveFeedback } from './ai_engine.js';
import { addRule, SITE_OPTIONS } from './ai_knowledge.js';
import { importFiles } from './ai_import.js';
import { exportFeedbackDataset, exportKnowledgeJson, exportRulesFaqCsv } from './ai_export.js';
import { reindexDocuments } from './ai_rag.js';
import { saveDataset } from './ai_tools.js';

const QUICK = [
  ['Items < 20', 'items < 20'],
  ['Rapport déplacements', 'générer rapport déplacement'],
  ['Import connaissances', 'import connaissances'],
  ['Ajouter règle', 'ajouter règle'],
  ['Export knowledge + dataset', 'export knowledge'],
];

const el = (tag, attrs = {}, html = '') => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (html) node.innerHTML = html;
  return node;
};

function downloadText(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderTable(rows = []) {
  if (!rows.length) return '<em>Aucune ligne.</em>';
  const headers = Object.keys(rows[0]);
  return `<table class="ai-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

async function onAsk(input, messages) {
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  messages.append(el('div', { class: 'ai-msg user' }, q));
  const answer = await askAi(q);

  const node = el('div', { class: 'ai-msg assistant' });
  node.innerHTML = `<strong>${answer.summary}</strong>${renderTable(answer.table || [])}<div><small>Citations: ${(answer.citations || []).join(' | ') || 'Aucune'}</small></div>`;

  const actions = el('div', { class: 'ai-actions' });
  (answer.actions || []).forEach((action) => {
    const b = el('button', { class: 'ghost btn-xs' }, action);
    b.onclick = () => {
      if (action === 'copy') navigator.clipboard?.writeText(JSON.stringify(answer.table || answer.summary));
      if (action === 'export_csv') downloadText('wms_export.csv', answer.exports?.csv || '', 'text/csv');
      if (action === 'export_pdf') downloadText('wms_export_print.html', answer.exports?.printHtml || '', 'text/html');
    };
    actions.append(b);
  });
  node.append(actions);

  const fb = el('div', { class: 'ai-actions' });
  const up = el('button', { class: 'ghost btn-xs' }, '👍 utile');
  up.onclick = async () => { await saveFeedback({ question: q, aiAnswer: answer.summary, helpful: true }); up.textContent = '✅ Merci'; };
  const down = el('button', { class: 'warn btn-xs' }, '👎 faux');
  down.onclick = async () => {
    const correction = prompt('Correction attendue');
    if (!correction) return;
    const why = prompt('Pourquoi ?') || '';
    const tags = (prompt('Tags (a,b)') || '').split(',').map((x) => x.trim()).filter(Boolean);
    const site = prompt('Site', 'GLOBAL') || 'GLOBAL';
    const markAsRule = confirm('Convertir en règle ?');
    await saveFeedback({ question: q, aiAnswer: answer.summary, helpful: false, correction, why, markAsRule, tags, site });
    down.textContent = '✅ enregistré';
  };
  fb.append(up, down);
  node.append(fb);

  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
  await saveChatTurn(q, answer.summary);
}

export async function initAiUi() {
  await initStore();
  const panel = el('aside', { class: 'ai-panel', id: 'aiPanel' });
  panel.innerHTML = `
  <button id="aiToggle" class="primary">Assistant IA</button>
  <section class="ai-drawer" id="aiDrawer">
    <header><strong>DL WMS Offline AI</strong></header>
    <div class="ai-quick" id="aiQuick"></div>
    <div class="ai-messages" id="aiMessages"></div>
    <div class="row"><input id="aiInput" placeholder="Question métier"/><button id="aiSend">Envoyer</button></div>
    <details><summary>Knowledge + règles</summary>
      <form id="aiRuleForm" class="stack"><input name="title" placeholder="Titre" required/><input name="site" placeholder="Site" list="sites"/><input name="tags" placeholder="tags a,b"/><textarea name="action" placeholder="Action"></textarea><button>Ajouter règle</button></form>
      <datalist id="sites">${SITE_OPTIONS.map((s) => `<option value="${s}"></option>`).join('')}</datalist>
      <label>Importer docs<input id="aiImportFiles" type="file" multiple/></label>
      <progress id="aiIndexProgress" max="100" value="0"></progress>
      <label>Inventaire CSV<input id="aiDatasetInventory" type="file" accept=".csv,.txt"/></label>
      <label>Réception CSV<input id="aiDatasetReception" type="file" accept=".csv,.txt"/></label>
    </details>
    <div class="row"><button id="aiExportAll">Exporter knowledge + dataset</button><button id="aiExportCsv">Exporter règles/FAQ</button></div>
  </section>`;
  document.body.append(panel);

  const drawer = panel.querySelector('#aiDrawer');
  panel.querySelector('#aiToggle').onclick = () => drawer.classList.toggle('open');
  const messages = panel.querySelector('#aiMessages');
  const input = panel.querySelector('#aiInput');
  panel.querySelector('#aiSend').onclick = () => onAsk(input, messages);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && onAsk(input, messages));

  const quick = panel.querySelector('#aiQuick');
  QUICK.forEach(([label, prompt]) => {
    const b = el('button', { class: 'ghost btn-xs' }, label);
    b.onclick = () => { input.value = prompt; onAsk(input, messages); };
    quick.append(b);
  });

  panel.querySelector('#aiRuleForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addRule({ title: fd.get('title'), site: fd.get('site') || 'GLOBAL', tags: String(fd.get('tags') || '').split(',').filter(Boolean), actions: [fd.get('action')], conditions: [] });
    e.target.reset();
    alert('Règle ajoutée');
  };

  panel.querySelector('#aiImportFiles').onchange = async (e) => {
    const progress = panel.querySelector('#aiIndexProgress');
    await importFiles(Array.from(e.target.files || []));
    await reindexDocuments({ onProgress: (p) => { progress.value = Math.round((p.current / Math.max(1, p.total)) * 100); } });
    alert('Documents importés + indexés');
  };

  panel.querySelector('#aiDatasetInventory').onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await saveDataset('inventory', f.name, new TextDecoder('utf-8').decode(await f.arrayBuffer()));
    alert('Inventaire importé');
  };
  panel.querySelector('#aiDatasetReception').onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await saveDataset('reception', f.name, new TextDecoder('utf-8').decode(await f.arrayBuffer()));
    alert('Réception importée');
  };

  panel.querySelector('#aiExportAll').onclick = async () => { await exportKnowledgeJson(); await exportFeedbackDataset(); };
  panel.querySelector('#aiExportCsv').onclick = exportRulesFaqCsv;
}

initAiUi();
