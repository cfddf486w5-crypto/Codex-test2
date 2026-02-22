import { listKnowledge, addFeedback, addValidatedExample } from './ai_knowledge.js';
import { searchChunks, normalizeText } from './ai_rag.js';
import { aggregateInventory, itemsUnder20, parseDatasetFromText, toCsv } from './ai_tools.js';
import { structuredAnswer } from './ai_prompts.js';
import { getAllEntities, putEntity } from './ai_store.js';

function similarity(a, b) {
  const aa = new Set(normalizeText(a).split(' '));
  const bb = new Set(normalizeText(b).split(' '));
  if (!aa.size || !bb.size) return 0;
  const inter = [...aa].filter((x) => bb.has(x)).length;
  return inter / Math.sqrt(aa.size * bb.size);
}

function detectIntent(question) {
  const q = normalizeText(question);
  if (q.includes('items') && q.includes('20')) return 'items_under_20';
  if (q.includes('deplacement')) return 'movement_list';
  if (q.includes('regle')) return 'explain_rule';
  if (q.includes('import')) return 'import_knowledge';
  if (q.includes('export')) return 'export_knowledge';
  return 'general';
}

export async function askAi(question) {
  const intent = detectIntent(question);
  const knowledge = await listKnowledge();
  const examples = knowledge.examples || [];
  const bestExample = examples.map((x) => ({ ...x, score: similarity(question, x.question || '') })).sort((a, b) => b.score - a.score)[0];

  if (bestExample && bestExample.score > 0.72) {
    return { summary: 'Réponse issue d’un exemple validé.', details: [bestExample.answer], source: 'validated_example', actions: ['copy'] };
  }

  if (intent === 'items_under_20' || intent === 'movement_list') {
    const datasets = await getAllEntities('datasets');
    const inv = datasets.find((x) => x.kind === 'inventory');
    const rec = datasets.find((x) => x.kind === 'reception');
    if (!inv || !rec) {
      return { summary: 'Importer inventaire + réception requis.', details: ['Utiliser “Importer connaissances” puis type dataset.'], source: 'tool' };
    }
    const rows = aggregateInventory(parseDatasetFromText(inv.text), parseDatasetFromText(rec.text));
    const list = itemsUnder20(rows);
    return {
      summary: `${list.length} items sous le seuil de 20.`,
      details: ['Liste générée via outil WMS.', `CSV prêt (${toCsv(list).length} caractères).`],
      table: list.slice(0, 12).map((r) => ({ item: r.item, total: r.total, bins: r.bins.length, recommandation: r.recommandation })),
      source: 'tool',
      actions: ['export_csv', 'export_pdf', 'copy'],
      payload: list,
    };
  }

  const rulesMatch = (knowledge.rules || []).filter((r) => similarity(question, `${r.title} ${r.description}`) > 0.25).slice(0, 3);
  const faqMatch = (knowledge.faqs || []).filter((f) => similarity(question, `${f.question} ${f.answer}`) > 0.25).slice(0, 3);
  const chunks = await searchChunks(question, 4);

  const details = [];
  rulesMatch.forEach((r) => details.push(`Règle: ${r.title} — ${r.description}`));
  faqMatch.forEach((f) => details.push(`FAQ: ${f.question} → ${f.answer}`));
  chunks.forEach((c) => details.push(`Doc(${c.source}): ${c.text.slice(0, 140)}...`));
  if (!details.length) details.push('Aucune connaissance proche trouvée. Ajoutez règles/docs ou corrigez cette réponse.');

  return {
    summary: `Intent: ${intent}. ${details.length} extrait(s) local(aux) utilisés.`,
    details,
    source: 'rag',
    actions: ['copy'],
  };
}

export async function saveChatTurn(question, answer) {
  return putEntity('chat_history', { question, answer });
}

export async function saveFeedback({ question, aiAnswer, helpful, correction, why, markAsRule }) {
  await addFeedback({ question, aiAnswer, helpful, correction, why, markAsRule });
  if (!helpful && correction) {
    await addValidatedExample({ question, answer: correction, why: why || '' });
  }
}
