// BEGIN PATCH: module FAQ réception
const FAQ_STORAGE_KEY = 'DLWMS_RECEPTION_FAQ_V1';
const NOTES_STORAGE_KEY = 'DLWMS_RECEPTION_FAQ_NOTES_V1';
const PREFS_STORAGE_KEY = 'DLWMS_RECEPTION_FAQ_PREFS_V1';

const DEFAULT_CHECKLIST = [
  'Conteneur # vérifié',
  'Photos de preuve prises',
  'Mapping colonnes validé',
  'Bins cibles confirmés (DLWMS_BINMAP)',
  'Réception confirmée / anomalies notées',
];

const DEFAULT_FAQ = [
  { id: 'demarrage-objectif', category: 'Démarrage / Objectif', question: 'Quel est l’objectif du module Réception ?', answer: 'Réceptionner rapidement les arrivages, sécuriser les quantités et tracer chaque écart dès le quai. Vérifier le conteneur, confirmer les références et préparer la mise en stock sans bloquer le flux.', keywords: ['objectif', 'quai', 'reception', 'conteneur'], severity: 'info' },
  { id: 'demarrage-flux', category: 'Démarrage / Objectif', question: 'Quel ordre suivre au démarrage ?', answer: '1) Scanner ou saisir le conteneur, 2) importer/ouvrir le fichier de réception, 3) valider le mapping item/qty/bin, 4) traiter les écarts, 5) confirmer et exporter les preuves.', keywords: ['ordre', 'workflow', 'steps'], severity: 'info' },
  { id: 'import-csv-tsv-xlsx', category: 'Import fichiers (CSV/TSV/XLSX)', question: 'Quels formats de fichier sont acceptés ?', answer: 'CSV et TSV sont natifs. XLSX peut être converti en CSV si le parseur local ne lit pas directement le format. Toujours vérifier les en-têtes après import.', keywords: ['csv', 'tsv', 'xlsx', 'import'], severity: 'warn' },
  { id: 'import-fichier-vide', category: 'Import fichiers (CSV/TSV/XLSX)', question: 'Pourquoi le fichier semble vide ?', answer: 'Causes fréquentes: mauvais séparateur, encodage atypique, première ligne non entête. Re-exporter en UTF-8 CSV avec séparateur virgule et en-têtes sur ligne 1.', keywords: ['vide', 'encodage', 'separateur'], severity: 'critical' },
  { id: 'mapping-colonnes', category: 'Mapping colonnes (item/qty/bin) + nettoyage', question: 'Comment mapper correctement ITEM / QTY / BIN ?', answer: 'Associer la colonne article (SKU/item), la quantité (qty) et le bin cible. Nettoyer les espaces, harmoniser casse, supprimer les lignes sans SKU.', keywords: ['mapping', 'item', 'qty', 'bin'], severity: 'info' },
  { id: 'mapping-quantite-zero', category: 'Mapping colonnes (item/qty/bin) + nettoyage', question: 'Que faire si qty reçue = 0 ?', answer: 'Conserver la ligne pour traçabilité mais exclure du put-away. Taguer en écart ou en attente selon procédure qualité locale.', keywords: ['qty 0', 'ecart', 'tracabilite'], severity: 'warn' },
  { id: 'group-item-bin', category: 'Regroupement (ITEM+BIN) + RECEPTION_STAGING', question: 'Pourquoi regrouper ITEM+BIN ?', answer: 'Pour éviter les doublons et calculer une quantité consolidée fiable avant confirmation. Utiliser une zone RECEPTION_STAGING pour valider avant écriture finale.', keywords: ['groupement', 'doublons', 'staging'], severity: 'info' },
  { id: 'binmap-cible', category: 'Bins cibles / Bin Map (DLWMS_BINMAP)', question: 'Comment utiliser DLWMS_BINMAP ?', answer: 'Appliquer le bin map en priorité pour proposer les bins cibles. Si bin absent, envoyer en zone tampon et signaler le manque de mapping.', keywords: ['binmap', 'dlwms_binmap', 'bins'], severity: 'warn' },
  { id: 'reception-partielle', category: 'Réception partielle, qty reçue = 0, sur/sous, damage', question: 'Comment gérer une réception partielle ou un sur/sous ?', answer: 'Saisir le reçu réel, conserver le commandé, puis noter le type d’écart (partiel/sur/sous). Les lignes endommagées doivent être taguées damage + isolées qualité.', keywords: ['partielle', 'sur', 'sous', 'damage'], severity: 'critical' },
  { id: 'photos-indexeddb', category: 'Photos preuves (IndexedDB), permissions caméra, stockage', question: 'Comment stocker les photos de preuve offline ?', answer: 'Capturer la photo et stocker en IndexedDB (DLWMS_RECEIPTS_DB_V1). Vérifier permissions caméra navigateur et quota stockage local.', keywords: ['photos', 'indexeddb', 'camera', 'quota'], severity: 'warn' },
  { id: 'confirmation-validations', category: 'Confirmation, validations, erreurs fréquentes', question: 'Quelles validations avant confirmation ?', answer: 'Vérifier SKU non vides, quantités numériques, bins valides, et absence de doublons critiques. Bloquer la confirmation si erreurs critiques détectées.', keywords: ['confirmation', 'validation', 'erreurs'], severity: 'critical' },
  { id: 'historique-export', category: 'Historique, export CSV/JSON, suppression, récup', question: 'Comment exporter et récupérer l’historique ?', answer: 'Exporter en JSON pour backup complet et CSV pour analyse. En cas de suppression locale, réimporter le backup JSON le plus récent versionné.', keywords: ['historique', 'export', 'backup', 'json'], severity: 'info' },
  { id: 'bonnes-pratiques-terrain', category: 'Bonnes pratiques terrain (tags, notes, checks)', question: 'Quelles bonnes pratiques terrain recommandées ?', answer: 'Utiliser des tags d’anomalie, des notes courtes actionnables, et une checklist systématique par conteneur pour limiter les oublis en quai.', keywords: ['terrain', 'tags', 'notes', 'checklist'], severity: 'info' },
  { id: 'depannage-xlsx', category: 'Dépannage (fichier vide, colonnes non trouvées, XLSX non détecté, quotas storage)', question: 'XLSX non détecté ou colonnes introuvables: que faire ?', answer: 'Convertir XLSX vers CSV UTF-8, renommer les en-têtes standard (item, qty, bin), et recharger. Si quota plein, purger anciens médias non critiques.', keywords: ['depannage', 'xlsx', 'colonnes', 'quota'], severity: 'critical' },
  { id: 'securite-donnees', category: 'Sécurité/qualité données (éviter doublons, versioning backup)', question: 'Comment éviter les pertes et doublons ?', answer: 'Versionner les exports JSON, garder un backup quotidien, et valider le hash/horodatage avant import. Éviter les imports multiples du même fichier source.', keywords: ['securite', 'doublons', 'versioning'], severity: 'warn' },
];

function safeParse(text, fallback) {
  try {
    const parsed = JSON.parse(text);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeFaq(raw) {
  if (!Array.isArray(raw) || !raw.length) return DEFAULT_FAQ;
  return raw.map((entry, index) => ({
    id: String(entry?.id || `faq-${index + 1}`),
    category: String(entry?.category || 'Général'),
    question: String(entry?.question || 'Question non fournie'),
    answer: String(entry?.answer || 'Réponse non fournie'),
    keywords: Array.isArray(entry?.keywords) ? entry.keywords.map((w) => String(w).toLowerCase()) : [],
    severity: ['info', 'warn', 'critical'].includes(entry?.severity) ? entry.severity : 'info',
  }));
}

function getFaqState() {
  const stored = safeParse(localStorage.getItem(FAQ_STORAGE_KEY) || '', null);
  if (!stored || !Array.isArray(stored.entries)) {
    const restored = { version: 1, entries: DEFAULT_FAQ };
    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(restored));
    return restored;
  }
  stored.entries = normalizeFaq(stored.entries);
  localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

function getNotesState() {
  return safeParse(localStorage.getItem(NOTES_STORAGE_KEY) || '', {});
}

function getPrefsState() {
  return safeParse(localStorage.getItem(PREFS_STORAGE_KEY) || '', { activeCategory: 'all', severity: 'all', search: '', accordion: {}, checklist: {} });
}

function savePrefs(nextPrefs) {
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(nextPrefs));
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

function renderFaqList(entries, root, prefs) {
  const list = root.querySelector('#receptionFaqList');
  const empty = root.querySelector('#receptionFaqEmpty');
  const status = root.querySelector('#receptionFaqStatus');
  if (!list) return;

  const search = (prefs.search || '').trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    const matchCategory = prefs.activeCategory === 'all' || entry.category === prefs.activeCategory;
    const matchSeverity = prefs.severity === 'all' || entry.severity === prefs.severity;
    if (!matchCategory || !matchSeverity) return false;
    if (!search) return true;
    const corpus = `${entry.question} ${entry.answer} ${entry.keywords.join(' ')}`.toLowerCase();
    return corpus.includes(search);
  });

  list.innerHTML = '';
  filtered.forEach((entry) => {
    const item = document.createElement('article');
    item.className = `faq-item severity-${entry.severity}`;
    const open = Boolean(prefs.accordion?.[entry.id]);
    item.innerHTML = `
      <button type="button" class="faq-question" data-faq-toggle="${entry.id}" aria-expanded="${open}">
        <span>${entry.question}</span>
        <small>${entry.category}</small>
      </button>
      <div class="faq-answer" ${open ? '' : 'hidden'}>
        <p>${entry.answer}</p>
        <div class="row">
          <button type="button" class="ghost" data-copy-id="${entry.id}">Copier</button>
          <span class="faq-severity-pill">${entry.severity}</span>
        </div>
      </div>
    `;
    list.append(item);
  });

  empty.hidden = filtered.length > 0;
  if (status) status.textContent = `${filtered.length} / ${entries.length} entrée(s) affichée(s)`;

  list.querySelectorAll('[data-copy-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = entries.find((entry) => entry.id === button.dataset.copyId);
      if (!item) return;
      await copyText(`Q: ${item.question}\nR: ${item.answer}`);
      status.textContent = 'Copie OK';
    });
  });

  list.querySelectorAll('[data-faq-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.faqToggle;
      const panel = button.nextElementSibling;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      prefs.accordion[id] = !expanded;
      savePrefs(prefs);
    });
  });
}

function renderCategoryFilters(entries, root, prefs, onChange) {
  const host = root.querySelector('#receptionFaqCategories');
  if (!host) return;
  const categories = ['all', ...new Set(entries.map((entry) => entry.category))];
  host.innerHTML = '';
  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip ${prefs.activeCategory === category ? 'active' : ''}`;
    button.textContent = category === 'all' ? 'Toutes' : category;
    button.addEventListener('click', () => {
      prefs.activeCategory = category;
      savePrefs(prefs);
      onChange();
    });
    host.append(button);
  });
}

function bindTeamNotes(root) {
  const notes = getNotesState();
  root.querySelectorAll('[data-notes-category]').forEach((field) => {
    const key = field.dataset.notesCategory;
    field.value = notes[key] || '';
    field.addEventListener('input', () => {
      notes[key] = field.value;
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    });
  });
}

function bindChecklist(root, prefs) {
  const host = root.querySelector('#receptionChecklist');
  if (!host) return;
  host.innerHTML = '';
  DEFAULT_CHECKLIST.forEach((label, index) => {
    const id = `faq-check-${index}`;
    const row = document.createElement('label');
    row.className = 'faq-check';
    row.innerHTML = `<input id="${id}" type="checkbox" ${prefs.checklist?.[id] ? 'checked' : ''} /><span>${label}</span>`;
    host.append(row);
  });
  host.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      prefs.checklist[input.id] = input.checked;
      savePrefs(prefs);
    });
  });
}

function exportFaqPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    faqData: getFaqState(),
    notes: getNotesState(),
    prefs: getPrefsState(),
  };
}

function triggerDownload(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dlwms-reception-faq-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function bindReceptionFaqPage(root = document) {
  const pageRoot = root.querySelector('#receptionFaqPage');
  if (!pageRoot) return;

  const faqState = getFaqState();
  const prefs = getPrefsState();
  prefs.accordion = prefs.accordion || {};
  prefs.checklist = prefs.checklist || {};

  const rerender = () => {
    renderCategoryFilters(faqState.entries, pageRoot, prefs, () => {
      renderFaqList(faqState.entries, pageRoot, prefs);
      renderCategoryFilters(faqState.entries, pageRoot, prefs, rerender);
    });
    renderFaqList(faqState.entries, pageRoot, prefs);
  };

  const search = pageRoot.querySelector('#receptionFaqSearch');
  const severity = pageRoot.querySelector('#receptionFaqSeverity');
  if (search) {
    search.value = prefs.search || '';
    search.addEventListener('input', () => {
      prefs.search = search.value;
      savePrefs(prefs);
      renderFaqList(faqState.entries, pageRoot, prefs);
    });
  }
  if (severity) {
    severity.value = prefs.severity || 'all';
    severity.addEventListener('change', () => {
      prefs.severity = severity.value;
      savePrefs(prefs);
      renderFaqList(faqState.entries, pageRoot, prefs);
    });
  }

  pageRoot.querySelector('#exportReceptionFaq')?.addEventListener('click', () => {
    triggerDownload(exportFaqPayload());
    pageRoot.querySelector('#receptionFaqStatus').textContent = 'Export JSON généré.';
  });

  pageRoot.querySelector('#importReceptionFaqFile')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = safeParse(await file.text(), null);
      if (!payload || typeof payload !== 'object') throw new Error('invalid');
      const incomingFaq = normalizeFaq(payload?.faqData?.entries || payload?.faqData || []);
      const existingById = new Map(faqState.entries.map((entry) => [entry.id, entry]));
      incomingFaq.forEach((entry) => existingById.set(entry.id, { ...existingById.get(entry.id), ...entry }));
      faqState.entries = [...existingById.values()];
      localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify({ version: 1, entries: faqState.entries }));
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ ...getNotesState(), ...(payload.notes || {}) }));
      if (payload.prefs && typeof payload.prefs === 'object') localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ ...prefs, ...payload.prefs }));
      bindTeamNotes(pageRoot);
      rerender();
      pageRoot.querySelector('#receptionFaqStatus').textContent = 'Import FAQ OK.';
    } catch {
      pageRoot.querySelector('#receptionFaqStatus').textContent = 'Import FAQ invalide.';
    }
    event.target.value = '';
  });

  bindTeamNotes(pageRoot);
  bindChecklist(pageRoot, prefs);
  rerender();
  requestAnimationFrame(() => search?.focus({ preventScroll: true }));
}

export function bindReceptionEntryPoints(root = document, navigate) {
  root.querySelectorAll('[data-open-reception-faq]').forEach((button) => {
    if (button.dataset.boundFaq) return;
    button.dataset.boundFaq = '1';
    button.addEventListener('click', () => navigate('reception-faq'));
  });
}

export function installReceptionFaqGlobals(navigate) {
  window.DLWMS_openReceptionFAQ = async () => {
    await navigate('reception-faq');
    const search = document.getElementById('receptionFaqSearch');
    search?.focus({ preventScroll: true });
  };
}
// END PATCH: module FAQ réception
