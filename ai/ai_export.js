import { getAllEntities } from './ai_store.js';

function download(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportKnowledgeJson() {
  const payload = {
    rules: await getAllEntities('rules'),
    sops: await getAllEntities('sops'),
    faqs: await getAllEntities('faqs'),
    examples: await getAllEntities('examples'),
    docs: await getAllEntities('docs'),
  };
  download(JSON.stringify(payload, null, 2), 'dlwms_knowledge.json');
}

export async function exportRulesFaqCsv() {
  const rules = await getAllEntities('rules');
  const faqs = await getAllEntities('faqs');
  const rows = ['type,title,question,answer,tags,priority'];
  rules.forEach((r) => rows.push(`rule,"${r.title || ''}",,"${(r.description || '').replaceAll('"', '""')}","${(r.tags || []).join('|')}",${r.priority || ''}`));
  faqs.forEach((f) => rows.push(`faq,,"${(f.question || '').replaceAll('"', '""')}","${(f.answer || '').replaceAll('"', '""')}","${(f.tags || []).join('|')}",`));
  download(rows.join('\n'), 'dlwms_rules_faq.csv', 'text/csv');
}

export async function exportFeedbackDataset() {
  const examples = await getAllEntities('examples');
  const rows = ['question,validated_answer,why'];
  examples.forEach((e) => rows.push(`"${(e.question || '').replaceAll('"', '""')}","${(e.answer || '').replaceAll('"', '""')}","${(e.why || '').replaceAll('"', '""')}"`));
  download(rows.join('\n'), 'dlwms_feedback_dataset.csv', 'text/csv');
}
