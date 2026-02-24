(() => {
  const I18N = {
    fr: {
      appTitle: 'Remise en stock',
      home: 'Accueil',
    },
    en: { appTitle: 'Putaway', home: 'Home' }
  };
  const locale = 'fr';

  const defaultFaq = [
    { q: 'Combien vaut un scan item ?', a: 'Règle: 1 scan item = 1 pièce.' },
    { q: 'Pourquoi confirmer le bin ?', a: 'Contrôle qualité: évite dépôt au mauvais emplacement.' },
    { q: 'Pourquoi justification forcer ?', a: 'Traçabilité obligatoire si qty non scannée entièrement.' },
    { q: 'Comment est triée la remise ?', a: 'Tri optimisé Zone → Allée → Bin.' }
  ];

  const rules = [
    { keys: ['forcer', 'justification'], answer: 'Le forçage demande une justification obligatoire pour audit interne.', source: 'Règle: FORCED doit être justifié' },
    { keys: ['tri', 'zone', 'allée', 'bin'], answer: 'La remise est triée Zone→Allée→Bin avec ordre custom de zones.', source: 'Règle: optimisation de parcours' },
    { keys: ['scrap', 'briser'], answer: 'Briser exige scan item + scrapbox puis journalisation complète.', source: 'Règle: flux Scrap' },
    { keys: ['rebox'], answer: 'Rebox est tagué puis traité en fin de parcours dans zone Rebox.', source: 'Règle: Rebox en fin de parcours' },
    { keys: ['scan', 'pièce'], answer: 'Chaque scan confirmé compte pour une unité.', source: 'Règle: scan item = 1 pièce' },
  ];

  const state = {
    route: location.hash || '#home',
    db: null,
    data: null,
    currentDraft: null,
    selectedRemiseId: null,
    treatIndex: 0,
    scanMode: 'item',
    lastScan: { value: '', at: 0 },
    whyContext: null
  };

  const defaults = {
    users: [{ id: 'u1', name: 'Opérateur Laval', active: true }],
    baskets: [], remises: [], itemsMap: {}, actions: [], scrapLogs: [], tasks: [],
    kb_notes: [],
    kb_faq: defaultFaq,
    settings: {
      scanDebounceMs: 300,
      requireBinConfirm: true,
      includeReboxAtEnd: true,
      zoneOrder: ['A', 'B', 'C', 'D', 'Rebox'],
      autoFocus: true,
      beepEnabled: false
    },
    nextIds: { remise: 1, basket: 1 }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const nowIso = () => new Date().toISOString();
  const activeUser = () => state.data.users.find(u => u.active) || state.data.users[0];
  const vibrate = () => navigator.vibrate && navigator.vibrate(30);

  const store = {
    key: 'dlwms_remise_v1',
    async init() {
      if ('indexedDB' in window) {
        try {
          state.db = await this.openIDB();
          state.data = await this.readIDB();
          return;
        } catch (_) {}
      }
      const raw = localStorage.getItem(this.key);
      state.data = raw ? JSON.parse(raw) : clone(defaults);
      this.ensure();
      this.flushLS();
    },
    ensure() {
      state.data = Object.assign(clone(defaults), state.data || {});
      state.data.settings = Object.assign(clone(defaults.settings), state.data.settings || {});
    },
    openIDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('dlwms_remise_db', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('main');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    readIDB() {
      return new Promise((resolve, reject) => {
        const tx = state.db.transaction('main', 'readonly');
        const rq = tx.objectStore('main').get('state');
        rq.onsuccess = () => { resolve(rq.result || clone(defaults)); this.ensure(); };
        rq.onerror = () => reject(rq.error);
      });
    },
    flushLS() { localStorage.setItem(this.key, JSON.stringify(state.data)); },
    async save() {
      this.ensure();
      if (state.db) {
        await new Promise((resolve, reject) => {
          const tx = state.db.transaction('main', 'readwrite');
          tx.objectStore('main').put(clone(state.data), 'state');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } else {
        this.flushLS();
      }
    }
  };

  function parseAlphaNum(s = '') {
    const m = String(s).match(/([a-zA-Z]*)(\d*)/);
    return { txt: (m?.[1] || '').toUpperCase(), num: parseInt(m?.[2] || '0', 10) };
  }

  function compareLoc(a, b) {
    const zoneOrder = state.data.settings.zoneOrder;
    const za = zoneOrder.indexOf(a.zone); const zb = zoneOrder.indexOf(b.zone);
    if (za !== zb) return (za === -1 ? 999 : za) - (zb === -1 ? 999 : zb);
    const aa = parseAlphaNum(a.aisle); const ab = parseAlphaNum(b.aisle);
    if (aa.txt !== ab.txt) return aa.txt.localeCompare(ab.txt);
    if (aa.num !== ab.num) return aa.num - ab.num;
    const ba = parseAlphaNum(a.bin); const bb = parseAlphaNum(b.bin);
    if (ba.txt !== bb.txt) return ba.txt.localeCompare(bb.txt);
    return ba.num - bb.num;
  }

  function nextRemiseId() {
    const n = state.data.nextIds.remise++;
    return `LAVREM${String(n).padStart(4, '0')}`;
  }
  function nextBasketId() {
    const n = state.data.nextIds.basket++;
    return `LAVREMP${String(n).padStart(2, '0')}`;
  }

  function normalizeScan(v) { return v.trim().toUpperCase(); }
  function antiDouble(v) {
    const t = Date.now();
    const ms = state.data.settings.scanDebounceMs;
    if (state.lastScan.value === v && t - state.lastScan.at < ms) return false;
    state.lastScan = { value: v, at: t };
    return true;
  }

  function beep() {
    if (!state.data.settings.beepEnabled) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = .05;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .08);
    } catch (_) {}
  }

  function toast(msg) {
    const old = $('#toast'); if (old) old.remove();
    const n = $('#tplToast').content.firstElementChild.cloneNode(true);
    n.textContent = msg; document.body.appendChild(n); setTimeout(() => n.remove(), 1700);
  }

  function openModal(node) {
    const backdrop = $('#modalBackdrop'); backdrop.innerHTML = ''; backdrop.appendChild(node); backdrop.classList.remove('hidden');
  }
  function closeModal() { $('#modalBackdrop').classList.add('hidden'); $('#modalBackdrop').innerHTML = ''; focusScan(); }

  function promptInput({ title, desc, placeholder = '', validate = () => true }) {
    return new Promise((resolve) => {
      const n = $('#tplPrompt').content.firstElementChild.cloneNode(true);
      $('#promptTitle', n).textContent = title;
      $('#promptDesc', n).textContent = desc;
      const input = $('#promptInput', n); input.placeholder = placeholder;
      $$('[data-act]', n).forEach(btn => btn.onclick = () => {
        if (btn.dataset.act === 'cancel') return closeModal(), resolve(null);
        if (!validate(input.value)) return toast('Valeur invalide');
        closeModal(); resolve(input.value.trim());
      });
      openModal(n); setTimeout(() => input.focus(), 50);
    });
  }

  function layout(header, content) {
    $('#topHeader').innerHTML = header;
    $('#routeView').innerHTML = content;
    wireScanInput();
  }

  function embeddedMode() {
    const q = new URLSearchParams(location.search);
    return q.get('embedded') === '1';
  }

  function renderHome() {
    const pending = state.data.remises.filter(r => r.status !== 'done').length;
    const user = activeUser();
    const header = embeddedMode()
      ? `<div class="row" style="justify-content:space-between"><strong>${I18N[locale].appTitle}</strong><button class="btn ghost" onclick="history.back()">Retour</button></div>`
      : `<div class="stack"><h1>${I18N[locale].appTitle}</h1><span class="small">DL.WMS Laval · Offline-first</span></div>`;

    const content = `
      <article class="card stack">
        <div class="row" style="justify-content:space-between"><strong>Utilisateur</strong><span>${user?.name || '-'}</span></div>
        <div class="row" style="justify-content:space-between"><strong>Remises en attente</strong><span class="badge pending">${pending}</span></div>
      </article>
      <article class="card grid-2">
        <button class="btn primary" data-go="#generate">Générer une remise</button>
        <button class="btn primary" data-go="#next">Prochaine remise</button>
        <button class="btn" data-go="#history">Historique</button>
        <button class="btn" data-go="#settings">Paramètres</button>
      </article>
      <article class="card row" style="gap:12px; justify-content:space-between;">
        <div class="row" style="gap:10px;">
          <img src="assets/icons/remise.svg" alt="Remise" width="48" height="48" />
          <div><strong>Tuile DL.WMS: Remise en stock</strong><p class="small">Prête pour routing vers /remise/</p></div>
        </div>
        <span class="badge pending">Module</span>
      </article>`;

    layout(header, content);
    $$('[data-go]').forEach(btn => btn.onclick = () => location.hash = btn.dataset.go);
  }

  function aggregateDraftItems() {
    const map = new Map();
    for (const e of state.currentDraft.items) {
      const current = map.get(e.sku) || { sku: e.sku, qty: 0, actions: [] };
      current.qty += 1;
      current.actions.push(...e.actions);
      map.set(e.sku, current);
    }
    return [...map.values()];
  }

  function renderGenerate() {
    state.currentDraft ||= { idTemp: `draft-${Date.now()}`, items: [] };
    const agg = aggregateDraftItems();
    const content = `
      <article class="card stack">
        <h2>Générer une remise</h2>
        <div class="row gap">
          <input id="scanInput" placeholder="Scanner ITEM" autocomplete="off" />
          <button id="scanBtn" class="btn primary">Valider</button>
        </div>
        <p class="small">1 scan = 1 pièce · Enter ou Valider</p>
      </article>
      <article class="card stack">
        <div class="row" style="justify-content:space-between"><h3>Liste en cours</h3><span>${agg.length} SKU</span></div>
        <div class="list">
          ${agg.map(i => `<button class="item-row" data-sku="${i.sku}"><strong>${i.sku}</strong> · Qty: ${i.qty}</button>`).join('') || '<p class="muted">Aucun scan</p>'}
        </div>
      </article>
      <button id="completeDraft" class="btn primary">Compléter remise</button>
    `;
    layout(`<h1>Génération</h1>`, content);

    $('#scanBtn').onclick = () => handleScanGenerate();
    $('#scanInput').onkeydown = (e) => e.key === 'Enter' && handleScanGenerate();
    $$('.item-row').forEach(el => el.onclick = () => openItemActions(el.dataset.sku));
    $('#completeDraft').onclick = completeDraft;
    focusScan();
  }

  async function handleScanGenerate() {
    const el = $('#scanInput'); if (!el) return;
    const sku = normalizeScan(el.value); el.value = '';
    if (!sku) return toast('Scan vide');
    if (!antiDouble(sku)) return;
    state.currentDraft.items.push({ sku, qty: 1, actions: [] });
    await store.save(); vibrate(); beep(); renderGenerate();
  }

  function openItemActions(sku) {
    const n = $('#tplActionPopover').content.firstElementChild.cloneNode(true);
    $('#actionSkuText', n).textContent = `SKU: ${sku}`;
    $$('[data-action]', n).forEach(btn => btn.onclick = async () => {
      const action = btn.dataset.action;
      if (action === 'cancel') return closeModal();
      if (action === 'delete') {
        const i = state.currentDraft.items.findIndex(x => x.sku === sku);
        if (i >= 0) state.currentDraft.items.splice(i, 1);
      }
      if (action === 'scrap') await runScrapFlow(sku);
      if (action === 'rebox') {
        const unit = state.currentDraft.items.find(x => x.sku === sku && !x.actions.some(a => a.type === 'rebox'));
        if (unit) unit.actions.push({ type: 'rebox', at: nowIso(), meta: {} });
      }
      await store.save(); closeModal(); renderGenerate();
    });
    openModal(n);
  }

  async function runScrapFlow(sku) {
    const item = await promptInput({ title: 'Scrap · scanner produit', desc: 'Confirmez le SKU', placeholder: sku, validate: v => normalizeScan(v) === sku });
    if (!item) return;
    const box = await promptInput({ title: 'Scrap · scanner bac', desc: 'Format Scrapbox1+', placeholder: 'SCRAPBOX1', validate: v => /^SCRAPBOX\d+$/i.test(v.trim()) });
    if (!box) return;
    const scrapBox = normalizeScan(box);
    const unit = state.currentDraft.items.find(x => x.sku === sku && !x.actions.some(a => a.type === 'scrap'));
    if (!unit) return;
    unit.actions.push({ type: 'scrap', at: nowIso(), meta: { scrapBox } });
    state.data.scrapLogs.push({ at: nowIso(), userId: activeUser().id, sku, basketOrRemiseId: state.currentDraft.idTemp, scrapBox, zone: '', bin: scrapBox, qty: 1 });
  }

  async function completeDraft() {
    if (!state.currentDraft?.items?.length) return toast('Aucun item scanné');
    const bid = await promptInput({
      title: 'Compléter remise',
      desc: 'Scanner panier/palette (LAVREMPxx)',
      placeholder: nextBasketId(),
      validate: v => /^LAVREMP\d{2}$/i.test(v.trim())
    });
    if (!bid) return;
    const basketId = normalizeScan(bid);
    if (!state.data.baskets.some(b => b.id === basketId)) state.data.baskets.push({ id: basketId, createdAt: nowIso(), notes: '' });

    const grouped = aggregateDraftItems().map(it => {
      const map = state.data.itemsMap[it.sku] || {};
      const scrapCount = it.actions.filter(a => a.type === 'scrap').length;
      const rebox = it.actions.some(a => a.type === 'rebox');
      return {
        sku: it.sku,
        shortDesc: map.shortDesc || '',
        zone: rebox ? 'Rebox' : (map.zone || ''),
        aisle: map.aisle || '',
        bin: map.bin || '',
        qtyTotal: it.qty,
        qtyRemaining: it.qty,
        rebox,
        scrapCount
      };
    }).sort(compareLoc);

    const remise = {
      id: nextRemiseId(), basketId, status: 'pending', createdAt: nowIso(), startedAt: null, doneAt: null,
      createdByUserId: activeUser().id, processedByUserId: null,
      lines: grouped,
      logs: [{ at: nowIso(), userId: activeUser().id, type: 'created', message: 'Remise générée', data: { basketId } }]
    };

    state.data.remises.push(remise);
    state.data.tasks.push({ at: nowIso(), type: 'archive_draft', draft: clone(state.currentDraft) });
    state.currentDraft = { idTemp: `draft-${Date.now()}`, items: [] };
    await store.save(); toast(`Remise ${remise.id} créée`); location.hash = '#next';
  }

  function renderNext() {
    const cards = state.data.remises.filter(r => r.status !== 'done').map(r => {
      const cls = r.status === 'pending' ? 'pending' : 'progress';
      return `<button class="item-row" data-remise="${r.id}">
        <div class="row" style="justify-content:space-between"><strong>${r.id}</strong><span class="badge ${cls}">${r.status}</span></div>
        <p class="small">${r.lines.length} lignes · Panier ${r.basketId}</p>
      </button>`;
    }).join('') || '<p class="muted">Aucune remise en attente.</p>';

    const content = `
      <article class="card stack">
        <h2>Prochaine remise</h2>
        <div class="row gap"><input id="scanInput" placeholder="Scanner ID remise (LAVREM0001)" /><button id="openRemiseBtn" class="btn primary">Ouvrir</button></div>
      </article>
      <article class="card stack"><h3>Liste</h3><div class="list">${cards}</div></article>`;

    layout('<h1>Prochaine remise</h1>', content);
    $('#openRemiseBtn').onclick = openRemiseByScan;
    $('#scanInput').onkeydown = e => e.key === 'Enter' && openRemiseByScan();
    $$('.item-row[data-remise]').forEach(el => el.onclick = () => openTreatment(el.dataset.remise));
    focusScan();
  }

  function openRemiseByScan() {
    const v = normalizeScan($('#scanInput').value || '');
    if (!/^LAVREM\d{4}$/.test(v)) return toast('Format remise invalide');
    openTreatment(v);
  }

  function currentRemise() { return state.data.remises.find(r => r.id === state.selectedRemiseId); }

  async function openTreatment(remiseId) {
    const rem = state.data.remises.find(r => r.id === remiseId);
    if (!rem) return toast('Remise introuvable');
    if (rem.status === 'pending') { rem.status = 'in_progress'; rem.startedAt = nowIso(); }
    state.selectedRemiseId = remiseId;
    state.treatIndex = rem.lines.findIndex(l => l.qtyRemaining > 0);
    if (state.treatIndex < 0) state.treatIndex = rem.lines.length;
    state.scanMode = 'item';
    await store.save(); location.hash = '#treatment';
  }

  function renderTreatment() {
    const rem = currentRemise();
    if (!rem) return location.hash = '#next';
    if (rem.lines.every(l => l.qtyRemaining <= 0)) return finishRemise(rem);
    const line = rem.lines[state.treatIndex] || rem.lines.find(l => l.qtyRemaining > 0);
    if (!line) return finishRemise(rem);
    const done = rem.lines.reduce((s, l) => s + (l.qtyTotal - l.qtyRemaining), 0);
    const total = rem.lines.reduce((s, l) => s + l.qtyTotal, 0);
    const pct = Math.round((done / total) * 100);

    const content = `
      <article class="card stack">
        <div class="row" style="justify-content:space-between"><strong>${rem.id}</strong><span class="badge progress">En cours</span></div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p class="small">${done}/${total} pièces</p>
      </article>
      <article class="card stack">
        <h3>${line.shortDesc || line.sku}</h3>
        <p>Zone <strong>${line.zone || '-'}</strong> · Allée <strong>${line.aisle || '-'}</strong> · Bin <strong>${line.bin || '-'}</strong></p>
        <p>Qty restante: <strong>${line.qtyRemaining}</strong> / ${line.qtyTotal}</p>
      </article>
      <article class="card stack">
        <div class="row gap"><input id="scanInput" placeholder="${state.scanMode === 'item' ? 'Scanner item' : 'Confirmer bin'}" /><button id="scanBtn" class="btn primary">Valider</button></div>
        <div class="row gap">
          <button id="undoBtn" class="btn ghost">Annuler / Retour arrière</button>
          <button id="manualBtn" class="btn icon-btn" title="Entrée manuelle">✍️</button>
          ${line.qtyRemaining > 1 ? '<button id="forceBtn" class="btn warning">Forcer</button>' : ''}
          <button id="whyBtn" class="btn">Pourquoi ?</button>
        </div>
      </article>`;

    layout('<h1>Traitement</h1>', content);
    $('#scanBtn').onclick = () => handleTreatmentScan(line);
    $('#scanInput').onkeydown = e => e.key === 'Enter' && handleTreatmentScan(line);
    $('#undoBtn').onclick = () => undoTreatment(rem);
    $('#manualBtn').onclick = () => manualEntry();
    $('#whyBtn').onclick = () => askWhy('bin_confirm');
    if ($('#forceBtn')) $('#forceBtn').onclick = () => forceLine(rem, line);
    focusScan();
  }

  async function handleTreatmentScan(line) {
    const rem = currentRemise(); if (!rem) return;
    const v = normalizeScan($('#scanInput').value || ''); $('#scanInput').value = '';
    if (!v || !antiDouble(v)) return;

    if (state.scanMode === 'item') {
      if (v !== line.sku) return toast('Mauvais item');
      line.qtyRemaining = Math.max(0, line.qtyRemaining - 1);
      rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'scan_item', message: `Scan ${line.sku}`, data: { qtyRemaining: line.qtyRemaining } });
      vibrate(); beep();
      if (line.qtyRemaining <= 0 || line.qtyRemaining === 1) {
        toast('Produit confirmé');
        if (state.data.settings.requireBinConfirm) state.scanMode = 'bin';
      }
    } else {
      if (v !== normalizeScan(line.bin || '')) return toast('Bin invalide');
      rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'scan_bin', message: `Bin ${line.bin} confirmé`, data: {} });
      toast('Remise complète');
      state.scanMode = 'item';
      state.treatIndex = rem.lines.findIndex(l => l.qtyRemaining > 0);
      if (state.treatIndex < 0) return finishRemise(rem);
    }
    await store.save(); renderTreatment();
  }

  async function forceLine(rem, line) {
    const reason = await promptInput({ title: 'Forcer la ligne', desc: 'Justification obligatoire', placeholder: 'Raison…', validate: v => v.trim().length > 2 });
    if (!reason) return;
    line.qtyRemaining = 0;
    rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'force', message: 'FORCED', data: { sku: line.sku, reason } });
    await store.save(); toast('Ligne forcée'); renderTreatment();
  }

  async function undoTreatment(rem) {
    const last = [...rem.logs].reverse().find(l => l.type === 'scan_item' || l.type === 'force');
    if (!last) return toast('Aucune action à annuler');
    const line = rem.lines.find(l => l.sku === (last.data?.sku || last.message.split(' ')[1]));
    if (!line) return;
    line.qtyRemaining = Math.min(line.qtyTotal, line.qtyRemaining + 1);
    rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'undo', message: 'Annulation étape', data: { sku: line.sku } });
    await store.save(); renderTreatment();
  }

  async function manualEntry() {
    const v = await promptInput({ title: 'Entrée manuelle', desc: 'Code item ou bin', validate: x => !!x.trim() });
    if (!v) return;
    $('#scanInput').value = normalizeScan(v);
    $('#scanBtn').click();
  }

  async function finishRemise(rem) {
    rem.status = 'done'; rem.doneAt = nowIso(); rem.processedByUserId = activeUser().id;
    rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'done', message: 'Remise terminée', data: {} });
    await store.save();
    layout('<h1>Fin de remise</h1>', `
      <article class="card stack">
        <h2>${rem.id} complétée ✅</h2>
        <button class="btn primary" data-go="#next">Prochaine remise</button>
        <button class="btn" data-go="#generate">Générer une remise</button>
      </article>`);
    $$('[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
  }

  function renderHistory() {
    const rows = state.data.remises.filter(r => r.status === 'done').map(r => `<button class="item-row" data-rid="${r.id}"><strong>${r.id}</strong><p class="small">${r.doneAt || ''}</p></button>`).join('') || '<p class="muted">Historique vide.</p>';
    layout('<h1>Historique</h1>', `
      <article class="card stack">
        <h3>Remises complétées</h3>
        <div class="list">${rows}</div>
      </article>
      <article class="card stack">
        <button id="exportJson" class="btn primary">Export JSON complet</button>
        <button id="exportRemises" class="btn">Export CSV remises</button>
        <button id="exportScrap" class="btn">Export CSV scrap log</button>
        <label class="btn ghost" for="importJson">Import JSON</label>
        <input id="importJson" type="file" accept="application/json" class="hidden" />
      </article>`);
    $('#exportJson').onclick = () => download('dlwms-remise-export.json', JSON.stringify(state.data, null, 2), 'application/json');
    $('#exportRemises').onclick = () => exportCsvRemises();
    $('#exportScrap').onclick = () => exportCsvScrap();
    $('#importJson').onchange = importJson;
  }

  function csvEscape(x) { return `"${String(x ?? '').replaceAll('"', '""')}"`; }
  function exportCsvRemises() {
    const lines = ['id,status,createdAt,doneAt,basketId,lines'];
    state.data.remises.forEach(r => lines.push([r.id,r.status,r.createdAt,r.doneAt||'',r.basketId,r.lines.length].map(csvEscape).join(',')));
    download('remises.csv', lines.join('\n'), 'text/csv');
  }
  function exportCsvScrap() {
    const lines = ['at,userId,sku,basketOrRemiseId,scrapBox,zone,bin,qty'];
    state.data.scrapLogs.forEach(r => lines.push([r.at,r.userId,r.sku,r.basketOrRemiseId,r.scrapBox,r.zone,r.bin,r.qty].map(csvEscape).join(',')));
    download('scrap-log.csv', lines.join('\n'), 'text/csv');
  }

  function download(name, text, type) {
    const b = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  async function importJson(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const incoming = JSON.parse(await f.text());
      mergeData(incoming);
      await store.save(); toast('Import terminé');
    } catch { toast('Import JSON invalide'); }
  }

  function mergeData(incoming) {
    ['users','baskets','remises','actions','scrapLogs','tasks','kb_notes'].forEach(k => {
      const base = state.data[k] || []; const add = incoming[k] || [];
      const seen = new Set(base.map(x => JSON.stringify(x)));
      add.forEach(x => { const sig = JSON.stringify(x); if (!seen.has(sig)) base.push(x); });
      state.data[k] = base;
    });
    state.data.itemsMap = Object.assign({}, state.data.itemsMap, incoming.itemsMap || {});
    state.data.settings = Object.assign({}, state.data.settings, incoming.settings || {});
    if (incoming.nextIds) {
      state.data.nextIds.remise = Math.max(state.data.nextIds.remise, incoming.nextIds.remise || 1);
      state.data.nextIds.basket = Math.max(state.data.nextIds.basket, incoming.nextIds.basket || 1);
    }
  }

  function renderSettings() {
    const zoneTxt = state.data.settings.zoneOrder.join(',');
    const users = state.data.users.map(u => `<button class="item-row" data-user="${u.id}"><strong>${u.name}</strong> ${u.active ? '✅' : ''}</button>`).join('');
    const notes = state.data.kb_notes.map((n, i) => `<div class="item-row"><strong>${n.q}</strong><p class="small">${n.a}</p><button class="btn ghost" data-del-note="${i}">Supprimer</button></div>`).join('');
    layout('<h1>Paramètres</h1>', `
      <article class="card stack">
        <h3>Scanner</h3>
        <label>Anti double-scan (ms)<input id="debounceMs" type="number" value="${state.data.settings.scanDebounceMs}"/></label>
        <label><input id="requireBin" type="checkbox" ${state.data.settings.requireBinConfirm ? 'checked' : ''}/> Exiger confirmation bin</label>
        <label><input id="autoFocus" type="checkbox" ${state.data.settings.autoFocus ? 'checked' : ''}/> Auto-focus scan</label>
      </article>
      <article class="card stack">
        <h3>Zones (ordre custom)</h3>
        <input id="zoneOrder" value="${zoneTxt}" />
      </article>
      <article class="card stack"><h3>Utilisateurs</h3>${users}<button id="addUser" class="btn">Ajouter utilisateur</button></article>
      <article class="card stack">
        <h3>Import mapping CSV (SKU,shortDesc,zone,aisle,bin)</h3>
        <input id="csvMap" type="file" accept=".csv,text/csv" />
      </article>
      <article class="card stack"><h3>KB notes IA</h3>${notes || '<p class="small">Aucune note.</p>'}<button id="addKb" class="btn">Ajouter note Q/R</button></article>
      <article class="card stack">
        <h3>Debug</h3>
        <button id="seedBtn" class="btn">Générer données exemple</button>
        <button id="resetBtn" class="btn danger">Reset local</button>
      </article>`);

    $('#debounceMs').onchange = saveSettings;
    $('#requireBin').onchange = saveSettings;
    $('#autoFocus').onchange = saveSettings;
    $('#zoneOrder').onchange = saveSettings;
    $$('.item-row[data-user]').forEach(u => u.onclick = () => setActiveUser(u.dataset.user));
    $('#addUser').onclick = addUser;
    $('#csvMap').onchange = importCsvMap;
    $('#addKb').onclick = addKbNote;
    $$('[data-del-note]').forEach(b => b.onclick = async () => { state.data.kb_notes.splice(+b.dataset.delNote, 1); await store.save(); renderSettings(); });
    $('#seedBtn').onclick = async () => { seedDemo(); await store.save(); toast('Données exemple générées'); };
    $('#resetBtn').onclick = async () => { if (confirm('Tout effacer ?')) { state.data = clone(defaults); await store.save(); renderSettings(); } };
  }

  async function saveSettings() {
    state.data.settings.scanDebounceMs = Math.max(100, +$('#debounceMs').value || 300);
    state.data.settings.requireBinConfirm = $('#requireBin').checked;
    state.data.settings.autoFocus = $('#autoFocus').checked;
    state.data.settings.zoneOrder = $('#zoneOrder').value.split(',').map(x => x.trim()).filter(Boolean);
    await store.save(); toast('Paramètres sauvegardés');
  }

  async function setActiveUser(id) {
    state.data.users.forEach(u => u.active = u.id === id);
    await store.save(); renderSettings();
  }

  async function addUser() {
    const name = await promptInput({ title: 'Nouveau user', desc: 'Nom affiché', validate: v => v.trim().length > 1 });
    if (!name) return;
    state.data.users.push({ id: `u${Date.now()}`, name: name.trim(), active: false });
    await store.save(); renderSettings();
  }

  async function addKbNote() {
    const q = await promptInput({ title: 'KB note', desc: 'Question', validate: v => !!v.trim() });
    if (!q) return;
    const a = await promptInput({ title: 'KB note', desc: 'Réponse', validate: v => !!v.trim() });
    if (!a) return;
    state.data.kb_notes.push({ q, a, at: nowIso() });
    await store.save(); renderSettings();
  }

  async function importCsvMap(e) {
    const f = e.target.files[0]; if (!f) return;
    const rows = (await f.text()).split(/\r?\n/).filter(Boolean).map(r => r.split(','));
    const head = rows.shift().map(h => h.trim().toLowerCase());
    const idx = (k) => head.indexOf(k);
    rows.forEach(r => {
      const sku = normalizeScan(r[idx('sku')] || '');
      if (!sku) return;
      state.data.itemsMap[sku] = {
        shortDesc: (r[idx('shortdesc')] || '').trim(),
        zone: (r[idx('zone')] || '').trim(),
        aisle: (r[idx('aisle')] || '').trim(),
        bin: (r[idx('bin')] || '').trim()
      };
    });
    await store.save(); toast('Mapping importé');
  }

  function seedDemo() {
    const bid = nextBasketId();
    state.data.baskets.push({ id: bid, createdAt: nowIso(), notes: 'seed' });
    state.data.itemsMap.DEMO1 = { shortDesc: 'Produit demo', zone: 'A', aisle: 'A1', bin: 'B01' };
    state.data.remises.push({
      id: nextRemiseId(), basketId: bid, status: 'pending', createdAt: nowIso(), startedAt: null, doneAt: null,
      createdByUserId: activeUser().id, processedByUserId: null,
      lines: [{ sku: 'DEMO1', shortDesc: 'Produit demo', zone: 'A', aisle: 'A1', bin: 'B01', qtyTotal: 3, qtyRemaining: 3, rebox: false, scrapCount: 0 }],
      logs: []
    });
  }

  function askWhy(topic) {
    const dict = {
      force: 'Justification requise pour conserver une trace audit (FORCED).',
      sorting: 'Ordre Zone→Allée→Bin réduit les déplacements et standardise le parcours.',
      bin_confirm: 'Confirmation bin évite erreur de rangement et améliore la qualité.'
    };
    toast(dict[topic] || 'Décision basée sur règles internes.');
  }

  function tokenize(txt) {
    return txt.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function askAssistant() {
    const q = ($('#iaInput').value || '').trim(); if (!q) return;
    $('#iaInput').value = '';
    const tokens = tokenize(q);
    const sources = [];
    let best = { score: 0, answer: 'Je n’ai pas trouvé de réponse exacte. Vérifiez les règles en Paramètres/KB.' };

    [...state.data.kb_faq, ...state.data.kb_notes].forEach(entry => {
      const hay = tokenize(`${entry.q} ${entry.a}`);
      const score = tokens.filter(t => hay.includes(t)).length;
      if (score > best.score) { best = { score, answer: entry.a }; sources.length = 0; sources.push(`FAQ/KB: ${entry.q}`); }
    });

    rules.forEach(r => {
      const score = r.keys.filter(k => tokens.includes(k)).length;
      if (score > best.score) { best = { score, answer: r.answer }; sources.length = 0; sources.push(r.source); }
    });

    const c = document.createElement('div'); c.className = 'ia-msg';
    c.innerHTML = `<strong>Q:</strong> ${q}<br/><strong>R:</strong> ${best.answer}<div class="kb-source">Sources: ${sources.join(' | ') || 'Aucune'}</div><button class="btn ghost" data-why="1">Pourquoi ?</button>`;
    c.querySelector('[data-why]').onclick = () => askWhy('sorting');
    $('#iaMessages').prepend(c);
  }

  function wireIA() {
    $('#iaToggle').onclick = () => {
      const b = $('#iaBody'); b.classList.toggle('hidden');
      $('#iaToggle').setAttribute('aria-expanded', String(!b.classList.contains('hidden')));
    };
    $('#iaAskBtn').onclick = askAssistant;
    $('#iaInput').onkeydown = e => e.key === 'Enter' && askAssistant();
  }

  function wireScanInput() {
    const i = $('#scanInput'); if (!i) return;
    if (state.data?.settings?.autoFocus !== false) setTimeout(() => i.focus(), 40);
  }
  function focusScan() { if (state.data?.settings?.autoFocus !== false) setTimeout(() => $('#scanInput')?.focus(), 40); }

  function render() {
    const route = location.hash || '#home';
    state.route = route;
    if (route === '#home') return renderHome();
    if (route === '#generate') return renderGenerate();
    if (route === '#next') return renderNext();
    if (route === '#treatment') return renderTreatment();
    if (route === '#history') return renderHistory();
    if (route === '#settings') return renderSettings();
    location.hash = '#home';
  }

  async function init() {
    await store.init();
    wireIA();
    $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
    window.addEventListener('hashchange', render);
    render();
  }

  init();
})();
