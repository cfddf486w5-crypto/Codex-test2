const routes = {
  dashboard: { title: "Dashboard" },
  consolidation: { title: "Consolidation" },
  ia: { title: "IA" },
  suivi: { title: "Suivi" },
  remise: { title: "Remise" },
  layout: { title: "Layout" },
  reception: { title: "Réception" },
};

const tabItems = [
  { route: "dashboard", label: "Dashboard", icon: "🏠" },
  { route: "consolidation", label: "Consol.", icon: "📦" },
  { route: "suivi", label: "Suivi", icon: "🚚" },
  { route: "remise", label: "Remise", icon: "🗂️" },
  { route: "layout", label: "Layout", icon: "🧭" },
  { route: "reception", label: "Réception", icon: "📥" },
];

const dashboardCards = [
  { route: "consolidation", title: "Consolidation", image: "consolidation-ios-dark.png", mini: "Consolidation" },
  { route: "ia", title: "IA", image: "assets/icons/ia-center-icon.svg", mini: "IA" },
  { route: "suivi", title: "Suivi Expédition", image: "suivi-expedition-ios-dark.png", mini: "Suivi" },
  { route: "remise", title: "Remise en Stock", image: "remise-ios-dark.png", mini: "Remise" },
  { route: "layout", title: "Layout", image: "layout-ios-dark.png", mini: "Layout" },
  { route: "reception", title: "Réception ASN", image: "receiving-ios-dark.png", mini: "Réception" },
];

const chartData = {
  labels: ["Expédié", "En cours", "En retard"],
  values: [58, 29, 13],
  colors: ["#1f7fe0", "#5eb4ff", "#b0c4de"],
};

const FAQ_RULES = [
  "Un BIN ne peut contenir qu'un seul SKU.",
  "Un move est recommandé uniquement s'il libère totalement au moins un bin source.",
  "RECEPTION_STAGING est une source virtuelle quand le BIN réception est vide.",
  "Les SKU sans diamètre validé passent en section À valider avec tâche obligatoire.",
  "Rapport Toilette_Cafeteria: total_after de 1 à 6; Verifier_Transfert: de 7 à 20.",
];

const DIAMETER_UNITS = [
  { min: 14, max: 15, units: 28 },
  { min: 16, max: 18, units: 24 },
  { min: 19, max: 20, units: 20 },
  { min: 21, max: 22, units: 16 },
  { min: 24, max: 26, units: 8 },
];

const TYPE_CAPACITY = { P1: 3, P2: 6, P3: 9, P4: 12, P5: 15, P6: 18, P7: 21 };
const TYPE_ORDER = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const TYPE_CRITICITY = { P7: 7, P6: 6, P5: 5, P4: 4, P3: 3, P2: 2, P1: 1 };

const DEFAULT_SETTINGS = {
  csvEncoding: "utf-8",
  csvFallbackEncoding: "iso-8859-1",
  csvDelimiter: "auto",
  fallbackTypeEnabled: false,
  maxTargetBins: 3,
  maxSourcesExport: 3,
  includePalletEstimate: true,
  zonePriority: ["L3", "L2", "L5"],
  strictSingleSkuPerBin: true,
  allowTypeFallback: false,
  annexesVersion: "1.1.0",
};

const DEFAULT_USERS = ["Superviseur", "Cariste_A", "Cariste_B"];

const KB_FAQ = [
  { q: "Pourquoi un move est absent ?", a: "Un move non libérateur de bin n'est pas affiché." },
  { q: "Pourquoi un SKU est en validation ?", a: "Diamètre/type/cible manquant: tâche obligatoire créée." },
  { q: "Comment gérer un .xlsx bin map ?", a: "Sans dépendance externe: exporter la feuille en CSV puis importer." },
];

const appView = document.getElementById("appView");
const toast = document.getElementById("toast");

init();
window.addEventListener("hashchange", renderRoute);

function init() {
  renderTabbar();
  if (!location.hash) location.hash = "#/dashboard";
  renderRoute();
}

function renderRoute() {
  const route = location.hash.replace("#/", "") || "dashboard";
  const current = routes[route] ? route : "dashboard";
  updateActiveTab(current);

  if (current === "dashboard") renderDashboard();
  else if (current === "ia") renderIA();
  else if (current === "consolidation") renderConsolidation();
  else renderPlaceholder(current);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTabbar() {
  const tabbar = document.getElementById("tabbar");
  tabbar.innerHTML = "";
  tabItems.forEach((tab) => {
    const button = document.createElement("button");
    button.className = "tab-item";
    button.innerHTML = `<span class="tab-icon">${tab.icon}</span><span>${tab.label}</span>`;
    button.addEventListener("click", () => (location.hash = `#/${tab.route}`));
    button.dataset.route = tab.route;
    tabbar.appendChild(button);
  });
}

function updateActiveTab(route) {
  document.querySelectorAll(".tab-item").forEach((item) => item.classList.toggle("active", item.dataset.route === route));
}

function renderDashboard() {
  const tpl = document.getElementById("dashboard-template").content.cloneNode(true);
  appView.innerHTML = "";
  appView.appendChild(tpl);

  const grid = document.getElementById("cardsGrid");
  dashboardCards.forEach((card) => {
    const button = document.createElement("button");
    button.className = "card-btn";
    button.innerHTML = `<span class="card-visual"><img src="${card.image}" alt="${card.title}"><span class="card-mini-label">${card.mini}</span></span><p class="card-title">${card.title}</p>`;
    button.addEventListener("click", () => (location.hash = `#/${card.route}`));
    grid.appendChild(button);
  });
  renderDonut();
}

function renderDonut() {
  const canvas = document.getElementById("donutChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const center = 110;
  const total = chartData.values.reduce((a, b) => a + b, 0);
  let current = -Math.PI / 2;
  chartData.values.forEach((value, i) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.lineWidth = 30;
    ctx.lineCap = "round";
    ctx.strokeStyle = chartData.colors[i];
    ctx.arc(center, center, 70, current, current + angle);
    ctx.stroke();
    current += angle;
  });
  ctx.fillStyle = "#1f2a3e";
  ctx.font = "700 20px -apple-system";
  ctx.textAlign = "center";
  ctx.fillText("100%", center, center + 6);

  document.getElementById("chartLegend").innerHTML = chartData.labels.map((label, i) => `<li><span class="legend-dot" style="background:${chartData.colors[i]}"></span>${label}: ${chartData.values[i]}%</li>`).join("");
}

function renderIA() {
  appView.innerHTML = "";
  appView.appendChild(document.getElementById("ia-template").content.cloneNode(true));
  const chatBox = document.getElementById("chatBox");
  const kb = getStorage("dlwms_kb", []);
  const messages = getStorage("dlwms_chat", [{ role: "bot", text: "Bonjour, je suis l'assistant IA offline DL WMS." }]);

  const paint = () => {
    chatBox.innerHTML = messages.map((m) => `<div class="bubble ${m.role}">${m.text}</div>`).join("");
    chatBox.scrollTop = chatBox.scrollHeight;
    document.getElementById("kbList").innerHTML = kb.map((n) => `<li><strong>${n.title}</strong> — ${n.content}</li>`).join("");
  };

  paint();

  document.getElementById("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const q = input.value.trim();
    if (!q) return;
    messages.push({ role: "user", text: q });
    messages.push({ role: "bot", text: aiReply(q, kb) });
    saveStorage("dlwms_chat", messages);
    input.value = "";
    paint();
  });

  document.getElementById("kbToggle").addEventListener("click", () => document.getElementById("kbPanel").classList.toggle("hidden"));
  document.getElementById("iaReset").addEventListener("click", () => {
    localStorage.removeItem("dlwms_chat");
    localStorage.removeItem("dlwms_kb");
    showToast("IA réinitialisée");
    renderIA();
  });

  document.getElementById("kbForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    kb.unshift({
      title: form.get("title"),
      content: form.get("content"),
      tags: String(form.get("tags") || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    });
    saveStorage("dlwms_kb", kb);
    e.target.reset();
    paint();
  });
}

function aiReply(question, kb) {
  const q = question.toLowerCase();
  if (q.includes("consolidation")) return "Ouvre Consolidation depuis le dashboard ou l'onglet bas.";
  if (q.includes("règle")) return FAQ_RULES.join(" ");
  const hit = kb.find((n) => `${n.title} ${n.content}`.toLowerCase().includes(q));
  if (hit) return `${hit.title}: ${hit.content}`;
  return "Pas de résultat exact offline. Ajoute une note dans la base locale.";
}

function renderConsolidation() {
  const state = hydrateConsolidationState();
  const calc = recomputeConsolidation(state);

  appView.innerHTML = `<section class="panel">
    <h1>Consolidation</h1>
    <div class="action-bar">
      <label class="small-btn">Import Inventaire<input type="file" id="inventoryFile" accept=".csv,text/csv" hidden></label>
      <label class="small-btn">Import Réception<input type="file" id="receivingFile" accept=".csv,text/csv" hidden></label>
      <label class="small-btn">Import Bin Map (.xlsx/.csv)<input type="file" id="binMapFile" accept=".xlsx,.csv,text/csv" hidden></label>
      <button class="small-btn" id="recomputeBtn">Recalculer</button>
      <button class="small-btn" id="exportMovesBtn">Export CSV Moves</button>
      <button class="small-btn" id="printBtn">Imprimer</button>
      <button class="small-btn" id="exportAnnexesBtn">Export Annexes</button>
      <label class="small-btn">Import Annexes<input type="file" id="importAnnexesFile" accept="application/json,.json" hidden></label>
      <button class="small-btn" id="toggleSettingsBtn">Paramètres</button>
    </div>
  </section>

  <section class="panel hidden" id="settingsPanel">${renderSettings(state.settings, state.users, state.activeUser)}</section>

  <section class="accordion-group" id="consolidationAccordions">
    ${accordion("Règles", `<ul>${FAQ_RULES.map((r) => `<li>${r}</li>`).join("")}</ul><p><a href="#" id="openSettingsLink">Ouvrir Paramètres</a></p>`, true)}
    ${accordion("Tâches", renderTasksSection(state.tasks), true)}
    ${accordion("Déplacements recommandés", renderMovesSection(calc.moves), true)}
    ${accordion("Bins libres / vides", renderFreeBinsSection(calc.freeBins), true)}
    ${accordion("À valider", renderValidationSection(calc.validationItems), true)}
  </section>

  <section class="panel ia-chat-panel">
    <button class="accordion-head" id="toggleLocalAi">IA locale (chat + FAQ) <span>▾</span></button>
    <div class="accordion-body hidden" id="localAiBody">${renderLocalAiPanel(state)}</div>
  </section>`;

  bindConsolidationEvents(state, calc);
}

function hydrateConsolidationState() {
  const settings = { ...DEFAULT_SETTINGS, ...getStorage("dlwms_settings", {}) };
  const users = getStorage("dlwms_users", DEFAULT_USERS);
  return {
    settings,
    users,
    activeUser: getStorage("dlwms_active_user", users[0]),
    inventoryRows: getStorage("dlwms_inventory_rows", []),
    receptionRows: getStorage("dlwms_reception_rows", []),
    binMap: getStorage("dlwms_bin_map", {}),
    diameterOverrides: getStorage("dlwms_diameter_overrides", {}),
    tasks: getStorage("dlwms_tasks", []),
    moveLogs: getStorage("dlwms_move_logs", []),
    kbNotes: getStorage("dlwms_kb_notes", []),
    aiChatHistory: getStorage("dlwms_ai_chat_history", [{ role: "bot", text: "IA locale prête. Pose une question sur règles/imports/moves." }]),
  };
}

function recomputeConsolidation(state) {
  const skuMap = new Map();
  const binOccupancy = new Map();

  const ingest = (rows, sourceKind) => {
    rows.forEach((r) => {
      const item = String(r.item || "").trim();
      const qty = Number(r.qty || 0);
      if (!item || !Number.isFinite(qty) || qty <= 0) return;
      const bin = sourceKind === "reception" && !String(r.bin || "").trim() ? "RECEPTION_STAGING" : String(r.bin || "").trim().toUpperCase();
      const key = `${item}__${bin}`;
      const prev = skuMap.get(key) || { item, bin, qty: 0, description: "", sourceKind };
      prev.qty += qty;
      prev.description = prev.description || String(r.description || "");
      skuMap.set(key, prev);

      if (bin !== "RECEPTION_STAGING") {
        const occ = binOccupancy.get(bin) || { skuSet: new Set(), qty: 0 };
        occ.skuSet.add(item);
        occ.qty += qty;
        binOccupancy.set(bin, occ);
      }
    });
  };

  ingest(state.inventoryRows, "inventory");
  ingest(state.receptionRows, "reception");

  const bySku = new Map();
  for (const row of skuMap.values()) {
    const cur = bySku.get(row.item) || { item: row.item, description: row.description, bins: [] };
    cur.bins.push({ bin: row.bin, qty: row.qty });
    if (!cur.description && row.description) cur.description = row.description;
    bySku.set(row.item, cur);
  }

  const tasks = [...state.tasks];
  const validationItems = [];
  const moves = [];

  for (const sku of bySku.values()) {
    const totalAfter = sku.bins.reduce((s, b) => s + b.qty, 0);
    const diameter = state.diameterOverrides[sku.item] || extractDiameter(sku.description || "");
    if (!diameter) {
      validationItems.push({ item: sku.item, reason: "DIAMÈTRE INCONNU", totalAfter });
      ensureTask(tasks, `Identifier diamètre pour ${sku.item}`, "DIAMÈTRE INCONNU");
      continue;
    }
    const units = unitsPerPallet(diameter);
    if (!units) {
      validationItems.push({ item: sku.item, reason: "TYPE INCONNU", totalAfter });
      ensureTask(tasks, `Valider type/capacité pour ${sku.item}`, "TYPE INCONNU");
      continue;
    }

    const pallets = Math.ceil(totalAfter / units);
    const requiredType = requiredTypeFromPallets(pallets);
    if (!requiredType) {
      validationItems.push({ item: sku.item, reason: "TYPE INCONNU", totalAfter });
      ensureTask(tasks, `Valider type/capacité pour ${sku.item}`, "TYPE INCONNU");
      continue;
    }

    const report = totalAfter >= 1 && totalAfter <= 6 ? "Toilette_Cafeteria" : totalAfter >= 7 && totalAfter <= 20 ? "Verifier_Transfert" : "Hors_Rapport";
    if (report === "Hors_Rapport") continue;

    const recommendation = chooseTargets(sku, requiredType, state, binOccupancy, units, pallets);
    if (!recommendation) {
      validationItems.push({ item: sku.item, reason: "AUCUNE BIN CIBLE POSSIBLE", totalAfter });
      ensureTask(tasks, `Identifier/créer une bin du type requis pour ${sku.item}`, "AUCUNE BIN CIBLE POSSIBLE");
      continue;
    }

    const candidateMove = buildMoveRecommendation(sku, recommendation, report, requiredType, units, state.settings);
    if (candidateMove && candidateMove.freedBins.length) moves.push(candidateMove);
  }

  saveStorage("dlwms_tasks", tasks);

  const freeBins = Object.entries(state.binMap)
    .filter(([bin, type]) => TYPE_ORDER.includes(type) && (!binOccupancy.has(bin) || binOccupancy.get(bin).qty === 0))
    .map(([bin, type]) => ({ bin, type }))
    .sort((a, b) => travelSort(a.bin, b.bin, state.settings.zonePriority));

  return { moves, validationItems, freeBins, tasks };
}

function chooseTargets(sku, requiredType, state, binOccupancy, units, pallets) {
  const bins = sku.bins.filter((b) => b.bin !== "RECEPTION_STAGING");
  const totalQty = sku.bins.reduce((s, b) => s + b.qty, 0);
  const capacityNeeded = totalQty;

  const fitsType = (t) => {
    if (!t) return false;
    if (t === requiredType) return true;
    if (!state.settings.fallbackTypeEnabled) return false;
    return TYPE_ORDER.indexOf(t) >= TYPE_ORDER.indexOf(requiredType);
  };

  const existing = bins
    .map((b) => ({ ...b, type: state.binMap[b.bin] }))
    .filter((b) => fitsType(b.type));

  if (existing.length) {
    const primary = existing.sort((a, b) => b.qty - a.qty)[0];
    return { targetBins: [primary.bin], targetType: primary.type || requiredType, mode: "B", fallback: primary.type !== requiredType };
  }

  const free = Object.entries(state.binMap)
    .filter(([bin, type]) => fitsType(type) && (!binOccupancy.has(bin) || binOccupancy.get(bin).qty === 0))
    .sort((a, b) => TYPE_ORDER.indexOf(a[1]) - TYPE_ORDER.indexOf(b[1]) || travelSort(a[0], b[0], state.settings.zonePriority));

  if (free.length) {
    const [bin, type] = free[0];
    const singleTypeCapacity = TYPE_CAPACITY[type] * units;
    if (singleTypeCapacity >= capacityNeeded) {
      return { targetBins: [bin], targetType: type, mode: "E", fallback: type !== requiredType };
    }
  }

  const splitCandidates = free.slice(0, Math.max(2, state.settings.maxTargetBins));
  if (splitCandidates.length >= 2) {
    const count = Math.min(state.settings.maxTargetBins, splitCandidates.length, pallets > 2 ? 3 : 2);
    return { targetBins: splitCandidates.slice(0, count).map((x) => x[0]), targetType: splitCandidates[0][1], mode: "C", fallback: splitCandidates[0][1] !== requiredType };
  }

  return null;
}

function buildMoveRecommendation(sku, recommendation, report, requiredType, units, settings) {
  const sources = sku.bins
    .map((s) => ({ ...s, sourceType: s.bin === "RECEPTION_STAGING" ? "P7" : "" }))
    .sort((a, b) => (a.bin === "RECEPTION_STAGING" ? -1 : b.bin === "RECEPTION_STAGING" ? 1 : b.qty - a.qty));

  const total = sources.reduce((s, sRow) => s + sRow.qty, 0);
  const target = recommendation.targetBins[0];
  let need = total;
  const usedSources = [];
  for (const src of sources) {
    if (!need) break;
    const qty = Math.min(src.qty, need);
    if (qty > 0) usedSources.push({ from_bin: src.bin, qty });
    need -= qty;
  }

  const freedBins = sources.filter((s) => s.bin !== target && s.qty > 0).map((s) => s.bin);
  if (!freedBins.length) return null;

  return {
    item: sku.item,
    to_bin: target,
    move_qty: total,
    report,
    requiredType,
    tags: [recommendation.mode, recommendation.fallback ? "Fallback type" : "Strict type"],
    why: `Mode ${recommendation.mode} appliqué. Type requis ${requiredType}. Cible ${target}. Sources triées pour libérer des bins.`,
    sources: usedSources,
    freedBins,
    pallets_est: settings.includePalletEstimate ? Math.floor(total / units) : "",
  };
}

function ensureTask(tasks, label, reason) {
  if (tasks.some((t) => t.label === label)) return;
  tasks.unshift({ id: `task_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`, label, status: "Nouveau", reason });
}

function renderTasksSection(tasks) {
  return `<div class="task-header"><label><input type="checkbox" id="filterValidationOnly"> Afficher seulement obligatoires</label></div>
  <table class="list-table"><thead><tr><th>Tâche</th><th>Raison</th><th>Statut</th><th>Action</th></tr></thead><tbody id="tasksBody">
  ${tasks.map((t) => `<tr data-task-id="${t.id}"><td>${t.label}</td><td>${t.reason || "-"}</td><td><select class="task-status"><option ${t.status === "Nouveau" ? "selected" : ""}>Nouveau</option><option ${t.status === "En traitement" ? "selected" : ""}>En traitement</option><option ${t.status === "Complété" ? "selected" : ""}>Complété</option></select></td><td><button class="small-btn task-save">Sauver</button></td></tr>`).join("")}
  </tbody></table>`;
}

function renderMovesSection(moves) {
  if (!moves.length) return "<p>Aucun move libérateur détecté.</p>";
  return `<table class="list-table"><thead><tr><th>item</th><th>to_bin</th><th>qty</th><th>report</th><th>sources</th><th>tags</th><th>IA</th><th>Log</th></tr></thead><tbody>
  ${moves.map((m, i) => `<tr><td>${m.item}</td><td>${m.to_bin}</td><td>${m.move_qty}</td><td>${m.report}</td><td>${m.sources.map((s) => `${s.from_bin}(${s.qty})`).join(", ")}</td><td>${m.tags.join(" | ")}</td><td><button class="small-btn why-btn" data-idx="${i}">Pourquoi ?</button></td><td><button class="small-btn log-btn" data-idx="${i}">Log move</button></td></tr>`).join("")}
  </tbody></table>`;
}

function renderFreeBinsSection(freeBins) {
  if (!freeBins.length) return "<p>Aucun bin libre.</p>";
  return `<ul>${freeBins.map((b) => `<li>${b.bin} (${b.type})</li>`).join("")}</ul>`;
}

function renderValidationSection(items) {
  if (!items.length) return "<p>Rien à valider.</p>";
  return `<table class="list-table"><thead><tr><th>item</th><th>raison</th><th>total_after</th><th>Override diamètre</th></tr></thead><tbody>
  ${items.map((it) => `<tr><td>${it.item}</td><td>${it.reason}</td><td>${it.totalAfter}</td><td><input type="number" min="14" max="26" class="diameter-override" data-item="${it.item}" placeholder="14..26"></td></tr>`).join("")}
  </tbody></table>`;
}

function renderSettings(settings, users, activeUser) {
  return `<h2>Paramètres</h2>
  <p class="muted">Sections repliables par catégorie. Tout est stocké offline dans les annexes.</p>
  <div class="settings-grid">
    <label>Recherche<input id="settingsSearch" placeholder="Filtrer"></label>
    <label>Encodage CSV<select id="setEncoding"><option value="utf-8" ${settings.csvEncoding === "utf-8" ? "selected" : ""}>UTF-8</option><option value="iso-8859-1" ${settings.csvEncoding === "iso-8859-1" ? "selected" : ""}>ISO-8859-1</option></select></label>
    <label>Fallback encodage<select id="setFallbackEncoding"><option value="iso-8859-1" ${settings.csvFallbackEncoding === "iso-8859-1" ? "selected" : ""}>ISO-8859-1</option><option value="utf-8" ${settings.csvFallbackEncoding === "utf-8" ? "selected" : ""}>UTF-8</option></select></label>
    <label>Délimiteur CSV<select id="setDelimiter"><option value="auto" ${settings.csvDelimiter === "auto" ? "selected" : ""}>Auto</option><option value="," ${settings.csvDelimiter === "," ? "selected" : ""}>,</option><option value=";" ${settings.csvDelimiter === ";" ? "selected" : ""}>;</option><option value="\t" ${settings.csvDelimiter === "\t" ? "selected" : ""}>TAB</option></select></label>
    <label>Fallback type (>= requis)<input type="checkbox" id="setFallbackType" ${settings.fallbackTypeEnabled ? "checked" : ""}></label>
    <label>maxTargetBins<input type="number" id="setMaxTargets" value="${settings.maxTargetBins}" min="2" max="5"></label>
    <label>max sources export<input type="number" id="setMaxSources" value="${settings.maxSourcesExport}" min="1" max="6"></label>
    <label>pallets_est export<input type="checkbox" id="setPalletEst" ${settings.includePalletEstimate ? "checked" : ""}></label>
    <label>Zone priority (csv)<input id="setZonePriority" value="${settings.zonePriority.join(",")}"></label>
    <label>Version annexes<input id="setAnnexVersion" value="${settings.annexesVersion || "1.1.0"}"></label>
    <label>Utilisateur actif<select id="activeUserSelect">${users.map((u) => `<option ${u === activeUser ? "selected" : ""}>${u}</option>`).join("")}</select></label>
    <label>Ajouter utilisateur<input id="newUserInput" placeholder="Nom utilisateur"></label>
  </div>
  <button class="small-btn" id="saveSettingsBtn">Enregistrer paramètres</button>`;
}

function renderLocalAiPanel(state) {
  return `<div class="chat-box" id="localAiMessages">${state.aiChatHistory.map((m) => `<div class="bubble ${m.role}">${m.text}</div>`).join("")}</div>
  <form class="chat-form" id="localAiForm"><input id="localAiInput" placeholder="Pourquoi ce move ? imports ?" required><button class="small-btn">Envoyer</button></form>
  <h3>KB locale</h3>
  <form id="kbNoteForm" class="kb-form"><input name="title" placeholder="Titre" required><textarea name="content" rows="2" placeholder="Note"></textarea><button class="small-btn">Ajouter note</button></form>
  <ul class="simple-list" id="kbNotesList">${state.kbNotes.map((n) => `<li><strong>${n.title}</strong>: ${n.content}</li>`).join("")}</ul>
  <h3>FAQ intégrée</h3><ul class="simple-list">${KB_FAQ.map((f) => `<li><strong>${f.q}</strong> — ${f.a}</li>`).join("")}</ul>`;
}

function bindConsolidationEvents(state, calc) {
  document.querySelectorAll(".accordion-head").forEach((btn) => {
    if (btn.id === "toggleLocalAi") return;
    btn.addEventListener("click", () => btn.nextElementSibling.classList.toggle("hidden"));
  });

  const onCsvImport = async (file, kind) => {
    const rows = await parseCsvFile(file, state.settings);
    const check = validateColumns(kind, rows);
    if (!check.ok) {
      showToast(check.message);
      return;
    }
    if (kind === "inventory") saveStorage("dlwms_inventory_rows", rows);
    if (kind === "reception") saveStorage("dlwms_reception_rows", rows);
    showToast(`${rows.length} lignes importées (${kind})`);
    renderConsolidation();
  };

  document.getElementById("inventoryFile").addEventListener("change", async (e) => e.target.files[0] && onCsvImport(e.target.files[0], "inventory"));
  document.getElementById("receivingFile").addEventListener("change", async (e) => e.target.files[0] && onCsvImport(e.target.files[0], "reception"));

  document.getElementById("binMapFile").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.name.toLowerCase().endsWith(".xlsx")) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
        showToast(".xlsx détecté: conversion CSV offline requise (voir docs/consolidation_xlsx_offline.md)");
        return;
      }
    }
    const rows = await parseCsvFile(f, state.settings);
    const map = {};
    rows.forEach((r) => {
      const bin = String(r.bin || r.BIN || r.col1 || "").trim().toUpperCase();
      const type = String(r.type || r.TYPE || r.col2 || "").trim().toUpperCase();
      if (bin && /^P[1-7]$/.test(type)) map[bin] = type;
    });
    saveStorage("dlwms_bin_map", map);
    showToast(`Bin map importée (${Object.keys(map).length} bins)`);
    renderConsolidation();
  });

  document.getElementById("recomputeBtn").addEventListener("click", () => renderConsolidation());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  document.getElementById("exportMovesBtn").addEventListener("click", () => {
    const csv = toMovesCsv(calc.moves, state.settings.maxSourcesExport, state.settings.includePalletEstimate);
    downloadFile("moves_export.csv", csv, "text/csv;charset=utf-8");
  });

  document.getElementById("exportAnnexesBtn").addEventListener("click", () => {
    const payload = {
      version: state.settings.annexesVersion || "1.1.0",
      exported_at: new Date().toISOString(),
      settings: getStorage("dlwms_settings", DEFAULT_SETTINGS),
      bin_map: getStorage("dlwms_bin_map", {}),
      diameter_overrides: getStorage("dlwms_diameter_overrides", {}),
      users: getStorage("dlwms_users", DEFAULT_USERS),
      active_user: getStorage("dlwms_active_user", DEFAULT_USERS[0]),
      tasks: getStorage("dlwms_tasks", []),
      move_logs: getStorage("dlwms_move_logs", []),
      kb_notes: getStorage("dlwms_kb_notes", []),
      ai_chat_history: getStorage("dlwms_ai_chat_history", []),
    };
    downloadFile("annexes_backup.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  });

  document.getElementById("importAnnexesFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const raw = await file.text();
    const data = JSON.parse(raw);
    if (!data || !data.version) throw new Error("Format annexes invalide");
    saveStorage("dlwms_settings", data.settings || DEFAULT_SETTINGS);
    saveStorage("dlwms_bin_map", data.bin_map || {});
    saveStorage("dlwms_diameter_overrides", data.diameter_overrides || {});
    saveStorage("dlwms_users", data.users || DEFAULT_USERS);
    saveStorage("dlwms_active_user", data.active_user || DEFAULT_USERS[0]);
    saveStorage("dlwms_tasks", data.tasks || []);
    saveStorage("dlwms_move_logs", data.move_logs || []);
    saveStorage("dlwms_kb_notes", data.kb_notes || []);
    saveStorage("dlwms_ai_chat_history", data.ai_chat_history || []);
    showToast("Annexes importées");
    renderConsolidation();
  });

  document.getElementById("toggleSettingsBtn").addEventListener("click", () => document.getElementById("settingsPanel").classList.toggle("hidden"));
  document.getElementById("openSettingsLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("settingsPanel").classList.remove("hidden");
  });

  document.getElementById("saveSettingsBtn")?.addEventListener("click", () => {
    const settings = {
      csvEncoding: document.getElementById("setEncoding").value,
      csvFallbackEncoding: document.getElementById("setFallbackEncoding").value,
      csvDelimiter: document.getElementById("setDelimiter").value,
      fallbackTypeEnabled: document.getElementById("setFallbackType").checked,
      maxTargetBins: Number(document.getElementById("setMaxTargets").value) || 3,
      maxSourcesExport: Number(document.getElementById("setMaxSources").value) || 3,
      includePalletEstimate: document.getElementById("setPalletEst").checked,
      zonePriority: document.getElementById("setZonePriority").value.split(",").map((z) => z.trim()).filter(Boolean),
      annexesVersion: document.getElementById("setAnnexVersion").value.trim() || "1.1.0",
    };
    saveStorage("dlwms_settings", settings);
    const users = [...state.users];
    const newUser = document.getElementById("newUserInput").value.trim();
    if (newUser && !users.includes(newUser)) users.push(newUser);
    saveStorage("dlwms_users", users);
    saveStorage("dlwms_active_user", document.getElementById("activeUserSelect").value);
    showToast("Paramètres enregistrés");
    renderConsolidation();
  });

  document.querySelectorAll(".task-save").forEach((btn) => btn.addEventListener("click", () => {
    const row = btn.closest("tr");
    const id = row.dataset.taskId;
    const status = row.querySelector(".task-status").value;
    const tasks = getStorage("dlwms_tasks", []).map((t) => (t.id === id ? { ...t, status } : t));
    saveStorage("dlwms_tasks", tasks);
    showToast("Tâche mise à jour");
  }));

  document.querySelectorAll(".log-btn").forEach((btn) => btn.addEventListener("click", () => {
    const idx = Number(btn.dataset.idx);
    const move = calc.moves[idx];
    const logs = getStorage("dlwms_move_logs", []);
    logs.unshift({
      at: new Date().toISOString(),
      user: getStorage("dlwms_active_user", "Superviseur"),
      item: move.item,
      sources: move.sources,
      to_bin: move.to_bin,
      qty: move.move_qty,
      report: move.report,
      tags: move.tags,
    });
    saveStorage("dlwms_move_logs", logs);
    showToast("Move journalisé");
  }));

  document.querySelectorAll(".why-btn").forEach((btn) => btn.addEventListener("click", () => {
    const idx = Number(btn.dataset.idx);
    alert(calc.moves[idx].why);
  }));

  document.querySelectorAll(".diameter-override").forEach((inp) => inp.addEventListener("change", () => {
    const val = Number(inp.value);
    if (val < 14 || val > 26) return;
    const o = getStorage("dlwms_diameter_overrides", {});
    o[inp.dataset.item] = val;
    saveStorage("dlwms_diameter_overrides", o);
    showToast(`Override diamètre: ${inp.dataset.item} -> ${val}`);
  }));

  document.getElementById("toggleLocalAi").addEventListener("click", () => document.getElementById("localAiBody").classList.toggle("hidden"));

  document.getElementById("localAiForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("localAiInput");
    const q = input.value.trim();
    if (!q) return;
    const history = getStorage("dlwms_ai_chat_history", []);
    history.push({ role: "user", text: q });
    history.push({ role: "bot", text: answerLocalAI(q, state, calc) });
    saveStorage("dlwms_ai_chat_history", history.slice(-40));
    renderConsolidation();
  });

  document.getElementById("kbNoteForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const notes = getStorage("dlwms_kb_notes", []);
    notes.unshift({ title: f.get("title"), content: f.get("content") });
    saveStorage("dlwms_kb_notes", notes);
    renderConsolidation();
  });
}

function answerLocalAI(question, state, calc) {
  const q = question.toLowerCase();
  if (q.includes("pourquoi") && calc.moves[0]) return calc.moves[0].why;
  if (q.includes("règle") || q.includes("rule")) return FAQ_RULES.join(" ");
  if (q.includes("xlsx")) return "Import .xlsx sans dépendance externe: exporter la feuille bin map en CSV puis importer (A=bin,B=type P1..P7).";
  if (q.includes("à valider")) return `Il y a ${calc.validationItems.length} SKU en validation.`;
  const note = (state.kbNotes || []).find((n) => `${n.title} ${n.content}`.toLowerCase().includes(q));
  return note ? `${note.title}: ${note.content}` : "Je réponds offline via FAQ + paramètres + notes locales.";
}

async function parseCsvFile(file, settings) {
  const enc = settings.csvEncoding || "utf-8";
  const fallback = settings.csvFallbackEncoding || "iso-8859-1";
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = decodeBytes(bytes, enc);
  const weird = (text.match(/�/g) || []).length;
  if (weird > 3) text = decodeBytes(bytes, fallback);
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const delimiter = settings.csvDelimiter === "auto" ? detectDelimiter(lines[0]) : settings.csvDelimiter;
  const headers = splitCsvLine(lines[0], delimiter).map((h, i) => normalizeHeader(h) || `col${i + 1}`);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ? cols[i].trim() : ""; });
    if (row.qty) row.qty = Number(String(row.qty).replace(",", "."));
    return row;
  }).filter((r) => Object.values(r).some(Boolean));
}

function validateColumns(kind, rows) {
  if (!rows.length) return { ok: false, message: "Fichier vide" };
  const first = rows[0];
  const has = (key) => Object.prototype.hasOwnProperty.call(first, key);
  if (kind === "inventory") {
    const ok = has("item") && has("qty") && has("bin") && has("description");
    return ok ? { ok: true } : { ok: false, message: "Inventaire attendu: item, qty, bin, description" };
  }
  if (kind === "reception") {
    const ok = has("item") && has("qty") && has("bin");
    return ok ? { ok: true } : { ok: false, message: "Réception attendue: item, qty, bin" };
  }
  return { ok: true };
}

function decodeBytes(bytes, encoding) {
  try { return new TextDecoder(encoding).decode(bytes); }
  catch { return new TextDecoder("utf-8").decode(bytes); }
}

function detectDelimiter(headerLine) {
  const opts = [",", ";", "\t", "|"];
  const counts = opts.map((d) => ({ d, c: headerLine.split(d).length }));
  counts.sort((a, b) => b.c - a.c);
  return counts[0].d;
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') q = !q;
    else if (ch === delimiter && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase();
}

function extractDiameter(description) {
  const text = String(description || "").toUpperCase();
  const hits = [];
  const mags = [...text.matchAll(/\b(1[4-9]|2[0-6])\s*[Xx]\s*\d{1,2}(?:[\.,]\d+)?\b/g)].map((m) => Number(m[1]));
  hits.push(...mags);
  const specific = [...text.matchAll(/\b(1[4-9]|2[0-6])\s*(?:"|PO|IN)\b/g)].map((m) => Number(m[1]));
  hits.push(...specific);
  const withR = [...text.matchAll(/\bR\s*(1[4-9]|2[0-6])\b/g)]
    .filter((m) => {
      const idx = m.index ?? 0;
      const prev = text[idx - 1] || " ";
      const prev2 = text[idx - 2] || " ";
      return !(prev === "/" || /\d/.test(prev2));
    })
    .map((m) => Number(m[1]));
  hits.push(...withR);
  const fallback = [...text.matchAll(/\b(1[4-9]|2[0-6])\b/g)].map((m) => Number(m[1]));
  hits.push(...fallback);
  if (!hits.length) return null;
  return Math.max(...hits);
}

function unitsPerPallet(diameter) {
  const d = Number(diameter);
  const row = DIAMETER_UNITS.find((r) => d >= r.min && d <= r.max);
  return row ? row.units : null;
}

function requiredTypeFromPallets(pallets) {
  return TYPE_ORDER.find((t) => pallets <= TYPE_CAPACITY[t]) || null;
}

function parseBin(bin) {
  const clean = String(bin || "").toUpperCase();
  const txt = clean.match(/^(L\d)([A-Z]+)$/);
  if (txt && ["TOILETTE", "CAFETERIA", "RECEPTION", "TEMPON"].some((k) => txt[2].includes(k))) {
    return { zone: txt[1], ranger: "", b: 0, h: "", pos: 0, sub: txt[2] };
  }
  const m = clean.match(/^(L\d)([A-Z])(\d{2})([A-Z]?)(\d{2})?$/);
  if (m) return { zone: m[1], ranger: m[2], b: Number(m[3]), h: m[4] || "", pos: Number(m[5] || 0), sub: "" };
  return { zone: "Z9", ranger: clean, b: 999, h: "", pos: 999, sub: "" };
}

function travelSort(a, b, zonePriority) {
  const pa = parseBin(a);
  const pb = parseBin(b);
  const rank = (z) => {
    const idx = zonePriority.indexOf(z);
    return idx === -1 ? 99 : idx;
  };
  return rank(pa.zone) - rank(pb.zone)
    || pa.ranger.localeCompare(pb.ranger)
    || pa.b - pb.b
    || pa.h.localeCompare(pb.h)
    || pa.pos - pb.pos
    || pa.sub.localeCompare(pb.sub);
}

function toMovesCsv(moves, maxSources, includePalletEstimate) {
  const headers = ["item", "to_bin", "move_qty", "report"];
  for (let i = 1; i <= maxSources; i += 1) headers.push(`from_bin${i}`, `qty${i}`);
  if (includePalletEstimate) headers.push("pallets_est");
  const lines = [headers.join(",")];

  moves.forEach((m) => {
    const sortedSources = [...m.sources].sort((a, b) => {
      if (a.from_bin === "RECEPTION_STAGING") return -1;
      if (b.from_bin === "RECEPTION_STAGING") return 1;
      const ta = TYPE_CRITICITY[(getStorage("dlwms_bin_map", {})[a.from_bin] || "P1")] || 1;
      const tb = TYPE_CRITICITY[(getStorage("dlwms_bin_map", {})[b.from_bin] || "P1")] || 1;
      return tb - ta || b.qty - a.qty;
    });
    const row = [m.item, m.to_bin, m.move_qty, m.report];
    for (let i = 0; i < maxSources; i += 1) {
      row.push(sortedSources[i]?.from_bin || "", sortedSources[i]?.qty || "");
    }
    if (includePalletEstimate) row.push(m.pallets_est ?? "");
    lines.push(row.join(","));
  });
  return lines.join("\n");
}

function accordion(title, body, closedByDefault) {
  return `<article class="accordion-item"><button class="accordion-head">${title}<span>▾</span></button><div class="accordion-body ${closedByDefault ? "hidden" : ""}">${body}</div></article>`;
}

function renderPlaceholder(route) {
  appView.innerHTML = `<section class='panel'><h1>${routes[route].title}</h1><p>Vue placeholder prête pour intégration.</p></section>`;
}

function getStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 1700);
}

function downloadFile(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
