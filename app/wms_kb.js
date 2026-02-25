const KB_PATH = './assets/data/kb_wms.json';
const KB_STORAGE_KEY = 'DLWMS_KB_WMS_V1';
let kbCache;

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchKb() {
  const response = await fetch(KB_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('KB indisponible');
  return response.json();
}

export async function loadWmsKb() {
  if (kbCache) return kbCache;
  try {
    kbCache = await fetchKb();
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kbCache));
    return kbCache;
  } catch {
    const backup = safeParse(localStorage.getItem(KB_STORAGE_KEY) || '');
    kbCache = backup || { kb_version: 'fallback', about: {}, rules: {}, bins: {}, tasks: {}, parameters: {}, history: {} };
    return kbCache;
  }
}

function toTextChunks(value, output = []) {
  if (value == null) return output;
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => toTextChunks(item, output));
    return output;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => toTextChunks(item, output));
  }
  return output;
}

export function searchWmsKb(kb, query = '', limit = 3) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  const sections = [
    ['about', kb.about],
    ['rules', kb.rules],
    ['bins', kb.bins],
    ['parameters', kb.parameters],
    ['tasks', kb.tasks],
    ['history', kb.history],
  ];

  return sections
    .map(([section, content]) => {
      const chunks = toTextChunks(content);
      const matching = chunks.filter((line) => line.toLowerCase().includes(q));
      return {
        section,
        score: matching.length,
        snippets: matching.slice(0, 2),
      };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function explainWhyFromKb(kb, section) {
  if (section === 'rules') return 'Parce que les règles garantissent la cohérence terrain et évitent les mouvements non valides.';
  if (section === 'bins') return 'Parce que le type de bin et la zone conditionnent la capacité et le flux de picking.';
  if (section === 'tasks') return 'Parce que les tâches traduisent l’analyse en actions exécutables sur le plancher.';
  if (section === 'parameters') return 'Parce que les paramètres fixent les garde-fous opérationnels (Top N, capacités, filtres).';
  if (section === 'history') return 'Parce que l’historique documente les décisions, les tests et leur impact.';
  return `Parce que la vision Complément WMS guide les décisions sans remplacer le WMS officiel (${kb?.about?.tagline || 'terrain-first'}).`;
}

export { KB_STORAGE_KEY };
