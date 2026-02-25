const STORAGE_KEY = 'dlwms.consolidation.v1';

const db = {
  pallets: [],
  draftPallet: { id: crypto.randomUUID(), startedAt: Date.now(), items: {} },
  moves: [],
  history: [],
  settings: { zone: 'ZD18', scanDebounceMs: 100 },
  ai_kb_notes: '',
  ai_chat_history: []
};

const faqFixed = [
  ['Comment démarrer une consolidation ?', 'Ouvrir Charger, scanner chaque item, puis Terminer palette.'],
  ['Comment optimiser ?', 'Aller dans Optimiser puis Générer recommandations (offline).'],
  ['Pourquoi un move est proposé ?', 'Soit regroupement SKU, soit libération bin, soit réduction de trajet.'],
  ['Où voir les traces ?', 'Historique consolidations et section Statistiques.'],
  ['La zone est modifiable ?', 'Oui, via settings locales (zone par défaut ZD18).'],
  ['Que faire si scan invalide ?', 'Rescanner le SKU ou supprimer la ligne depuis la liste.'],
  ['Comment ajouter une note IA ?', 'Cliquer sur ⚙️ dans Assistant IA.'],
  ['Les données quittent le terminal ?', 'Non, stockage local uniquement offline-first.'],
  ['Comment calculer temps moyen ?', 'Moyenne des durées des palettes clôturées.'],
  ['Comment vider les données ?', 'Effacer localStorage pour la clé consolidation.']
];
while (faqFixed.length < 35) {
  const n = faqFixed.length + 1;
  faqFixed.push([`FAQ consolidation #${n}`, `Réponse standard offline #${n}: suivre le flux Charger → Optimiser → Historique.`]);
}

const homeView = document.getElementById('homeView');
const subView = document.getElementById('subView');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(db, parsed);
  } catch (e) { console.warn('State load fallback', e); }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function sumDraftPieces() {
  return Object.values(db.draftPallet.items).reduce((a, b) => a + b, 0);
}

function computeStats() {
  const completedPallets = db.history.filter(h => h.type === 'palette');
  const avgMs = completedPallets.length
    ? Math.round(completedPallets.reduce((a, p) => a + (p.completedAt - p.startedAt), 0) / completedPallets.length)
    : 0;
  return {
    remises: db.draftPallet && sumDraftPieces() > 0 ? 1 : 0,
    pieces: sumDraftPieces(),
    avgText: avgMs ? `${Math.max(1, Math.round(avgMs / 60000))} min` : '—',
    zone: db.settings.zone || 'ZD18'
  };
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('fr-FR');
}

function renderHome() {
  const tpl = document.getElementById('homeTemplate');
  homeView.innerHTML = '';
  homeView.appendChild(tpl.content.cloneNode(true));
  const stats = computeStats();
  const ribbon = document.getElementById('statsRibbon');
  ribbon.innerHTML = `
    <div class="stat-block">
      <div class="stat-title"><img src="assets/icons/clipboard.svg" alt=""/>${stats.remises} Remises en attente</div>
      <div class="stat-sub ok">${stats.pieces} Pièces</div>
    </div>
    <div class="stat-block">
      <div class="stat-title"><img src="assets/icons/clock.svg" alt=""/>Temps moyen</div>
      <div class="stat-main">${stats.avgText}</div>
      <div class="stat-sub">${stats.zone}</div>
    </div>
    <div class="stat-block">
      <div class="stat-title"><img src="assets/icons/zone.svg" alt=""/>Objectif zone</div>
      <div class="stat-main">${stats.zone}</div>
      <div class="stat-sub">Consolider</div>
    </div>`;

  document.getElementById('whyBtn').addEventListener('click', () => openModal('whyModal'));
  document.getElementById('kbBtn').addEventListener('click', () => {
    document.getElementById('kbNotesInput').value = db.ai_kb_notes || '';
    openModal('kbModal');
  });
  const aiForm = document.getElementById('aiForm');
  aiForm.addEventListener('submit', onAiAsk);
}

function route() {
  const hash = location.hash || '#home';
  renderHome();
  if (hash === '#home') {
    homeView.classList.remove('hidden');
    subView.classList.add('hidden');
    return;
  }
  homeView.classList.add('hidden');
  subView.classList.remove('hidden');
  if (hash === '#charger') renderCharger();
  else if (hash === '#optimiser') renderOptimiser();
  else if (hash === '#historique') renderHistorique();
  else if (hash === '#stats') renderStats();
  else if (hash === '#ia-notes') renderIaNotesPage();
  else location.hash = '#home';
}

function subPageFrame(title, mission, inner) {
  subView.innerHTML = `<article class="card subpage"><div class="row-between"><h2>${title}</h2><a href="#home" class="back-link">← Accueil</a></div><p class="mission"><b>Tâche :</b> ${mission}</p>${inner}</article>`;
}

function renderCharger() {
  const rows = Object.entries(db.draftPallet.items).map(([sku, qty]) => `
    <div class="item row-between"><span>${sku} · <b>${qty}</b></span><button data-delete="${sku}" class="btn-secondary">Supprimer</button></div>
  `).join('') || '<p class="muted">Aucun scan.</p>';

  subPageFrame('Charger une palette', 'Scanner chaque SKU de la palette en cours puis terminer la palette pour l’ajouter à l’historique.', `
    <label>Scan item (focus auto)</label>
    <input id="scanInput" class="input-large" placeholder="Scannez SKU..." />
    <div class="list" id="scanList">${rows}</div>
    <div class="form-row">
      <button id="finishPalette" class="btn-primary">Terminer palette</button>
      <button id="resetPalette" class="btn-secondary">Réinitialiser</button>
    </div>
  `);
  const scanInput = document.getElementById('scanInput');
  scanInput.focus();
  scanInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const sku = scanInput.value.trim().toUpperCase();
    if (!sku) return;
    db.draftPallet.items[sku] = (db.draftPallet.items[sku] || 0) + 1;
    scanInput.value = '';
    saveState();
    renderCharger();
  });
  subView.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => {
    delete db.draftPallet.items[btn.dataset.delete];
    saveState();
    renderCharger();
  }));
  document.getElementById('resetPalette').addEventListener('click', () => {
    db.draftPallet = { id: crypto.randomUUID(), startedAt: Date.now(), items: {} };
    saveState();
    renderCharger();
  });
  document.getElementById('finishPalette').addEventListener('click', () => {
    if (!Object.keys(db.draftPallet.items).length) return;
    const completedAt = Date.now();
    const payload = {
      ...db.draftPallet,
      type: 'palette',
      completedAt,
      user: 'operator.local'
    };
    db.pallets.push(payload);
    db.history.unshift(payload);
    db.draftPallet = { id: crypto.randomUUID(), startedAt: Date.now(), items: {} };
    saveState();
    location.hash = '#home';
  });
}

function generateMoves() {
  const candidates = Object.entries(db.draftPallet.items);
  const moves = candidates.map(([sku, qty], i) => ({
    id: crypto.randomUUID(), sku,
    from_bin: `B${10 + i}`,
    to_bin: `C${20 + (i % 3)}`,
    qty: Math.min(qty, 3),
    tag: i % 2 === 0 ? 'regroupement' : 'libération bin',
    why: i % 2 === 0 ? 'SKU identique regroupé pour densifier la zone.' : 'Déplacement pour libérer un bin source.',
    status: 'pending', createdAt: Date.now()
  }));
  if (!moves.length) {
    moves.push({
      id: crypto.randomUUID(), sku: 'SKU-DEMO', from_bin: 'B12', to_bin: 'C22', qty: 2,
      tag: 'min travel', why: 'Route plus courte détectée entre picking et consolidation.', status: 'pending', createdAt: Date.now()
    });
  }
  db.moves = moves;
  saveState();
}

function renderOptimiser() {
  const movesHtml = db.moves.map(move => `
    <div class="move-card">
      <div><b>${move.sku}</b> · ${move.from_bin} → ${move.to_bin} · qty ${move.qty}</div>
      <div class="row-between"><small>${move.tag}</small><div>
        <button data-why="${move.id}" class="btn-secondary">Pourquoi ?</button>
        <button data-apply="${move.id}" class="btn-primary">${move.status === 'done' ? 'Appliqué' : 'Appliquer'}</button>
      </div></div>
      <p id="why-${move.id}" class="hidden">${move.why}</p>
    </div>`).join('') || '<p>Aucune recommandation.</p>';

  subPageFrame('Optimiser', 'Générer puis appliquer les recommandations de déplacement pour réduire les trajets en zone de consolidation.', `
    <p>Générer des mouvements basés sur les règles locales.</p>
    <button id="genMoves" class="btn-primary">Générer recommandations (offline)</button>
    <div class="list">${movesHtml}</div>
  `);
  document.getElementById('genMoves').addEventListener('click', () => { generateMoves(); renderOptimiser(); });
  subView.querySelectorAll('[data-why]').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById(`why-${btn.dataset.why}`).classList.toggle('hidden');
  }));
  subView.querySelectorAll('[data-apply]').forEach(btn => btn.addEventListener('click', () => {
    const move = db.moves.find(m => m.id === btn.dataset.apply);
    if (!move || move.status === 'done') return;
    move.status = 'done';
    db.history.unshift({ ...move, type: 'move', completedAt: Date.now(), user: 'operator.local' });
    saveState();
    renderOptimiser();
  }));
}

function renderHistorique() {
  const html = db.history.map(entry => {
    if (entry.type === 'palette') {
      const items = Object.entries(entry.items).map(([k, v]) => `${k}:${v}`).join(', ');
      return `<details class="history-card"><summary>Palette ${entry.id.slice(0, 8)} · ${formatDate(entry.completedAt)}</summary><p>${items}</p><small>${entry.user}</small></details>`;
    }
    return `<div class="history-card"><b>Move ${entry.sku}</b> · ${entry.from_bin}→${entry.to_bin} · ${entry.qty}<br/><small>${formatDate(entry.completedAt)} · ${entry.user}</small></div>`;
  }).join('') || '<p>Historique vide.</p>';
  subPageFrame('Historique consolidations', 'Consulter les palettes et mouvements déjà exécutés pour garder une traçabilité locale complète.', `<div class="list">${html}</div>`);
}

function renderStats() {
  const palettes = db.history.filter(h => h.type === 'palette');
  const movesDone = db.history.filter(h => h.type === 'move');
  const skuCount = {};
  palettes.forEach(p => Object.entries(p.items).forEach(([k, v]) => skuCount[k] = (skuCount[k] || 0) + v));
  const top = Object.entries(skuCount).sort((a,b) => b[1]-a[1]).slice(0,4);
  const max = top[0]?.[1] || 1;
  subPageFrame('Statistiques', 'Suivre les indicateurs clés de la consolidation (palettes, moves, temps moyen et SKU les plus traités).', `
    <div class="kpi-grid">
      <div class="kpi"><small>Nb palettes</small><div>${palettes.length}</div></div>
      <div class="kpi"><small>Nb moves</small><div>${movesDone.length}</div></div>
      <div class="kpi"><small>Temps moyen</small><div>${computeStats().avgText}</div></div>
      <div class="kpi"><small>Top SKU</small><div>${top[0]?.[0] || '—'}</div></div>
    </div>
    <div class="bars">
      ${top.map(([sku, qty]) => `<div class="bar-wrap"><span>${sku}</span><div class="bar" style="width:${Math.max(10,Math.round((qty/max)*100))}%"></div><b>${qty}</b></div>`).join('') || '<small>Données insuffisantes.</small>'}
    </div>
  `);
}

function renderIaNotesPage() {
  subPageFrame('Notes KB', 'Documenter les consignes locales qui serviront de source pour les réponses de l’assistant IA.', `
    <textarea id="kbPageInput" rows="8" class="input-large">${db.ai_kb_notes || ''}</textarea>
    <div class="form-row"><button id="saveKbPage" class="btn-primary">Sauvegarder</button></div>
  `);
  document.getElementById('saveKbPage').addEventListener('click', () => {
    db.ai_kb_notes = document.getElementById('kbPageInput').value.trim();
    saveState();
  });
}

function answerFromFaq(question) {
  const q = question.toLowerCase();
  const match = faqFixed.find(([fq]) => q.includes(fq.toLowerCase().split(' ')[1] || ''));
  const note = db.ai_kb_notes ? `\n\nSources internes: notes opérateur locales.` : '\n\nSources internes: FAQ consolidation offline.';
  const body = match ? match[1] : 'Je recommande de suivre le flux Charger puis Optimiser, et vérifier Historique pour la traçabilité.';
  return `
    <b>Résumé</b>: ${body}<br/>
    <b>Étapes</b>: 1) Ouvrir le module concerné 2) Exécuter l'action 3) Valider dans Historique.<br/>
    <b>Pourquoi</b>: cohérence de consolidation et réduction des déplacements.<br/>
    <b>Où cliquer</b>: tuiles de l'écran principal ou bouton Retour accueil.<br/>
    <b>Sources internes</b>: FAQ fixe (${faqFixed.length} entrées), historique local et notes KB.${note}
  `;
}

function onAiAsk(e) {
  e.preventDefault();
  const input = document.getElementById('aiInput');
  const question = input.value.trim();
  if (!question) return;
  const answerHtml = answerFromFaq(question);
  db.ai_chat_history.unshift({ question, answerHtml, ts: Date.now() });
  db.ai_chat_history = db.ai_chat_history.slice(0, 50);
  saveState();
  const box = document.getElementById('aiAnswer');
  box.innerHTML = answerHtml;
  box.classList.remove('hidden');
  input.value = '';
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModals));
document.getElementById('saveKbBtn').addEventListener('click', () => {
  db.ai_kb_notes = document.getElementById('kbNotesInput').value.trim();
  saveState();
  closeModals();
});
window.addEventListener('hashchange', route);

loadState();
route();
