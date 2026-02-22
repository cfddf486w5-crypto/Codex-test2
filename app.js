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

const defaultRules = [
  "Objectif: regrouper les quantités d’un item dans le moins de bins possible.",
  "Prioriser la libération des bins critiques/rares.",
  "Éviter de mélanger des produits dans un même bin (sauf règle explicitement autorisée).",
  "Créer une recommandation de move seulement si elle réduit le nombre total de bins utilisés OU libère un bin.",
  "Toujours afficher: item, bins source, qty par bin, bin cible suggéré, gain attendu.",
];

const defaultTasks = [
  { id: "t1", label: "Consolider ITEM-001", status: "Incomplète" },
  { id: "t2", label: "Valider move zone A", status: "Partielle" },
  { id: "t3", label: "Confirmer bin B-08", status: "Complète" },
];

const defaultMoves = [
  { item: "ITEM-001", bins: "A-01(2), A-07(5)", target: "A-07", qty: 2, reason: "libère bin" },
  { item: "ITEM-078", bins: "C-11(3), C-12(4)", target: "C-12", qty: 3, reason: "réduit bins" },
];

const defaultEmptyBins = ["B-03", "D-09", "E-14", "A-15"];

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
  document.querySelectorAll(".tab-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.route === route);
  });
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
    const item = {
      title: form.get("title"),
      content: form.get("content"),
      tags: String(form.get("tags") || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    };
    kb.unshift(item);
    saveStorage("dlwms_kb", kb);
    e.target.reset();
    paint();
    showToast("Note enregistrée");
  });
}

function aiReply(question, kb) {
  const q = question.toLowerCase();
  if (q.includes("consolidation") || q.includes("ouvrir consolidation")) {
    return `La page Consolidation est disponible. <button class="small-btn" onclick="location.hash='#/consolidation'">Ouvre Consolidation</button>`;
  }
  if (q.includes("règle") || q.includes("consolider")) return defaultRules.join(" ");
  const hit = kb.find((n) => `${n.title} ${n.content} ${(n.tags || []).join(" ")}`.toLowerCase().includes(q));
  if (hit) return `Selon ta base locale: ${hit.title} — ${hit.content}`;
  return "Je n'ai pas trouvé. Suggestions: 'où est la consolidation?', 'règles de consolidation', ou ajoute une note dans Base de connaissances.";
}

function renderConsolidation() {
  appView.innerHTML = "";
  appView.appendChild(document.getElementById("consolidation-template").content.cloneNode(true));

  const state = {
    tasks: getStorage("dlwms_tasks", defaultTasks),
    movesLog: getStorage("dlwms_moves_log", []),
    emptyBins: getStorage("dlwms_empty_bins", defaultEmptyBins),
  };

  const sections = [
    { title: "Règles de consolidation", body: `<ul>${defaultRules.map((r) => `<li>${r}</li>`).join("")}</ul>` },
    { title: "Tâches", body: renderTasksBody(state.tasks) },
    { title: "Déplacements recommandés", body: renderMovesBody(defaultMoves) },
    { title: "Bins libres / vides", body: `<ul>${state.emptyBins.map((b) => `<li>${b}</li>`).join("")}</ul><button class='small-btn' id='exportBins'>Exporter la liste</button>` },
    { title: "Imports / Format", body: "<p>CSV inventaire: item, qty, bin.</p><p>CSV réception: item, qty, bin.</p><p>Excel natif non supporté offline: exporter en CSV avant import.</p>" },
  ];

  const holder = document.getElementById("consolidationAccordions");
  holder.innerHTML = sections.map((s, i) => `<article class='accordion-item'><button class='accordion-head' data-idx='${i}'>${s.title}<span>▾</span></button><div class='accordion-body hidden'>${s.body}</div></article>`).join("");

  holder.querySelectorAll(".accordion-head").forEach((btn) => btn.addEventListener("click", () => btn.nextElementSibling.classList.toggle("hidden")));

  bindConsolidationActions(state);
}

function renderTasksBody(tasks) {
  return `<label><input id='onlyIncomplete' type='checkbox'> Afficher seulement Incomplètes</label><ul id='taskList'>${tasks.map((t) => `<li>${t.label} — ${t.status} <button class='small-btn task-done' data-id='${t.id}'>Marquer complétée</button></li>`).join("")}</ul>`;
}

function renderMovesBody(moves) {
  return `<table class='list-table'><thead><tr><th>Item</th><th>Bins actuels</th><th>Bin cible</th><th>Qty</th><th>Raison</th><th>Actions</th></tr></thead><tbody>${moves.map((m, i) => `<tr><td>${m.item}</td><td>${m.bins}</td><td>${m.target}</td><td>${m.qty}</td><td>${m.reason}</td><td><button class='small-btn copy-move' data-i='${i}'>Copier</button><button class='small-btn log-move' data-i='${i}'>Ajouter au log</button></td></tr>`).join("")}</tbody></table>`;
}

function bindConsolidationActions(state) {
  const inventoryFile = document.getElementById("inventoryFile");
  const receivingFile = document.getElementById("receivingFile");
  const parseCsv = (file, key) => {
    const reader = new FileReader();
    reader.onload = () => {
      saveStorage(key, reader.result);
      showToast(`${file.name} importé`);
    };
    reader.readAsText(file);
  };
  inventoryFile.addEventListener("change", (e) => e.target.files[0] && parseCsv(e.target.files[0], "dlwms_last_inventory"));
  receivingFile.addEventListener("change", (e) => e.target.files[0] && parseCsv(e.target.files[0], "dlwms_last_receiving"));

  document.getElementById("exportPdf").addEventListener("click", () => window.print());
  document.getElementById("exportCsv").addEventListener("click", () => {
    const csv = "item,bins,target,qty,reason\n" + defaultMoves.map((m) => `${m.item},"${m.bins}",${m.target},${m.qty},${m.reason}`).join("\n");
    downloadFile("moves_export.csv", csv);
  });
  document.getElementById("recomputeBtn").addEventListener("click", () => showToast("Recalcul effectué (mock)"));

  document.querySelectorAll(".task-done").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.id;
    state.tasks = state.tasks.map((t) => (t.id === id ? { ...t, status: "Complète" } : t));
    saveStorage("dlwms_tasks", state.tasks);
    renderConsolidation();
  }));

  const only = document.getElementById("onlyIncomplete");
  if (only) only.addEventListener("change", () => {
    const list = document.getElementById("taskList");
    list.querySelectorAll("li").forEach((li) => li.style.display = only.checked && !li.textContent.includes("Incomplète") ? "none" : "list-item");
  });

  document.querySelectorAll(".copy-move").forEach((b) => b.addEventListener("click", () => {
    const move = defaultMoves[Number(b.dataset.i)];
    navigator.clipboard?.writeText(JSON.stringify(move));
    showToast("Ligne copiée");
  }));

  document.querySelectorAll(".log-move").forEach((b) => b.addEventListener("click", () => {
    state.movesLog.push(defaultMoves[Number(b.dataset.i)]);
    saveStorage("dlwms_moves_log", state.movesLog);
    showToast("Move ajouté au log");
  }));

  const exportBins = document.getElementById("exportBins");
  if (exportBins) exportBins.addEventListener("click", () => downloadFile("bins_vides.csv", `bin\n${state.emptyBins.join("\n")}`));
}

function renderPlaceholder(route) {
  appView.innerHTML = `<section class='panel'><h1>${routes[route].title}</h1><p>Vue placeholder prête pour intégration.</p></section>`;
}

function getStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function showToast(text) { toast.textContent = text; toast.classList.add("show"); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove("show"), 1400); }
function downloadFile(name, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
