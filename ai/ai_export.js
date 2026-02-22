import { getAllEntities } from './ai_store.js';

function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportKnowledgeJson() {
  const payload = {
    rules: await getAllEntities('rules'),
    faqs: await getAllEntities('faqs'),
    sops: await getAllEntities('sops'),
    docs: await getAllEntities('docs'),
    chunksMeta: (await getAllEntities('chunks')).map((c) => ({ id: c.id, source: c.source, section: c.section })),
    examples: await getAllEntities('examples'),
    feedback: await getAllEntities('feedback'),
  };
  download('dlwms_knowledge.json', JSON.stringify(payload, null, 2));
}

export async function exportRulesFaqCsv() {
  const rows = [...await getAllEntities('rules'), ...await getAllEntities('faqs')];
  const csv = ['type;title;content', ...rows.map((r) => `${r.conditions ? 'rule' : 'faq'};"${r.title || r.question || ''}";"${(r.actions?.join(' ') || r.answer || '').replaceAll('"', '""')}"`)].join('\n');
  download('dlwms_rules_faq.csv', csv, 'text/csv');
}

export async function exportFeedbackDataset() {
  const rows = await getAllEntities('examples');
  const jsonl = rows.map((r) => JSON.stringify(r)).join('\n');
  download('dlwms_examples.jsonl', jsonl, 'application/x-ndjson');
}
