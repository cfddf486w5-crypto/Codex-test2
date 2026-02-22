import { expandWithSynonyms } from './ai_synonyms.js';

const CATALOG = [
  ['import_inventaire', ['import', 'inventaire']],
  ['import_reception', ['import', 'reception']],
  ['merge_totals', ['fusion', 'total']],
  ['list_items_under_threshold', ['item', '20']],
  ['generate_moves_report', ['rapport', 'deplacement']],
  ['explain_rule', ['expliquer', 'regle']],
  ['create_rule', ['ajouter', 'regle']],
  ['search_knowledge', ['chercher', 'connaissance']],
  ['export_excel', ['export', 'excel']],
  ['export_pdf', ['export', 'pdf']],
  ['export_csv', ['export', 'csv']],
  ['show_item_detail', ['detail', 'item']],
];

export function parseIntent(text) {
  const words = expandWithSynonyms(text);
  const raw = String(text || '').toLowerCase();
  const thresholdMatch = raw.match(/<(\s*\d+)/) || raw.match(/seuil\s*(\d+)/);
  const args = { threshold: thresholdMatch ? Number(thresholdMatch[1]) : 20 };

  let best = { intent: 'search_knowledge', score: 0 };
  CATALOG.forEach(([intent, needles]) => {
    const score = needles.reduce((acc, n) => acc + (words.includes(n) || raw.includes(n) ? 1 : 0), 0);
    if (score > best.score) best = { intent, score };
  });
  return { ...best, args, words };
}
