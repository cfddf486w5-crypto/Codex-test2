const TOP_LEFT_ICON = "gear"; // gear | menu

const cards = [
  { id: "consolidation", title: "Consolidation", image: "consolidation-ios-dark.png" },
  { id: "inventaire", title: "Inventaire", image: "assets/icons/inventaire.svg" },
  { id: "suivi", title: "Suivi Expédition", image: "suivi-expedition-ios-dark.png" },
  { id: "remise", title: "Remise en Stock", image: "remise-ios-dark.png" },
  { id: "layout", title: "Layout", image: "layout-ios-dark.png" },
  { id: "reception", title: "Réception ASN", image: "receiving-ios-dark.png" },
];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "consol", label: "Consol.", icon: "📦" },
  { id: "suivi", label: "Suivi", icon: "🚚" },
  { id: "remise", label: "Remise", icon: "🗂️" },
  { id: "layout", label: "Layout", icon: "🧭" },
  { id: "reception", label: "Réception", icon: "📥" },
];

const chartData = {
  labels: ["Expédié", "En cours", "En retard"],
  values: [58, 29, 13],
  colors: ["#1f7fe0", "#5eb4ff", "#b0c4de"],
};

const cardsGrid = document.getElementById("cardsGrid");
const tabbar = document.getElementById("tabbar");
const modal = document.getElementById("appModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const toast = document.getElementById("toast");

if (TOP_LEFT_ICON === "menu") {
  document.getElementById("leftTopIcon").textContent = "☰";
}

cards.forEach((card) => {
  const button = document.createElement("button");
  button.className = "card-btn";
  button.type = "button";
  button.innerHTML = `
    <span class="card-visual">
      <img src="${card.image}" alt="${card.title}" />
      <span class="card-mini-label">${card.title}</span>
    </span>
    <p class="card-title">${card.title}</p>
  `;
  button.addEventListener("click", () => openPage(card.title));
  cardsGrid.appendChild(button);
});

tabs.forEach((tab, index) => {
  const button = document.createElement("button");
  button.className = `tab-item ${index === 0 ? "active" : ""}`;
  button.type = "button";
  button.dataset.tab = tab.id;
  button.innerHTML = `<span class="tab-icon">${tab.icon}</span><span class="tab-label">${tab.label}</span>`;
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(`Navigation: ${tab.label}`);
  });
  tabbar.appendChild(button);
});

function openPage(name) {
  modalTitle.textContent = `Page: ${name}`;
  modalText.textContent = `${name} (à connecter)`;
  modal.showModal();
  showToast(`Ouverture ${name}`);
}

document.getElementById("closeModal").addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => {
  const rect = modal.getBoundingClientRect();
  const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (isOutside) modal.close();
});

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.remove("show"), 1400);
}

document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    if (pill.dataset.action === "settings") {
      modalTitle.textContent = "Paramètres";
      modalText.textContent = "Version app: 1.0.0 · Build: 2026.02 · Thème: iOS Bleu";
      modal.showModal();
      return;
    }
    showToast(pill.textContent.trim());
  });
});

function renderDonut() {
  const canvas = document.getElementById("donutChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 220;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  const center = size / 2;
  const radius = 84;
  const line = 32;
  const total = chartData.values.reduce((a, b) => a + b, 0);
  let current = -Math.PI / 2;

  chartData.values.forEach((value, i) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.lineWidth = line;
    ctx.strokeStyle = chartData.colors[i];
    ctx.lineCap = "round";
    ctx.arc(center, center, radius, current, current + angle);
    ctx.stroke();
    current += angle;
  });

  ctx.fillStyle = "#1f2a3e";
  ctx.font = "700 22px -apple-system";
  ctx.textAlign = "center";
  ctx.fillText("100%", center, center + 7);

  document.getElementById("chartLegend").innerHTML = chartData.labels
    .map((label, i) => `<li><span class="legend-dot" style="background:${chartData.colors[i]}"></span>${label}: ${chartData.values[i]}%</li>`)
    .join("");
}

renderDonut();
window.addEventListener("resize", renderDonut);
