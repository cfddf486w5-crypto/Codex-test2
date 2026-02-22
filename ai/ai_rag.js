import { getAllEntities, putEntity } from './ai_store.js';

const STOPWORDS = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'et', 'ou', 'un', 'une', 'a', 'au', 'aux', 'pour']);

export function normalizeText(text = '') {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalizeText(text).split(' ').filter((t) => t && !STOPWORDS.has(t));
}

export function splitIntoChunks(text, size = 420) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const chunks = [];
  for (let i = 0; i < cleaned.length; i += size) chunks.push(cleaned.slice(i, i + size));
  return chunks;
}

export async function indexDocument(doc) {
  const chunks = splitIntoChunks(doc.text || '');
  const records = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const terms = tokenize(chunk);
    const termFreq = terms.reduce((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {});
    records.push(await putEntity('chunks', { docId: doc.id, position: i, text: chunk, terms: termFreq, source: doc.name }));
  }
  return records.length;
}

export async function searchChunks(query, limit = 5) {
  const qTerms = tokenize(query);
  if (!qTerms.length) return [];
  const chunks = await getAllEntities('chunks');
  const docs = await getAllEntities('docs');

  const docFreq = {};
  chunks.forEach((chunk) => {
    const uniq = new Set(Object.keys(chunk.terms || {}));
    uniq.forEach((term) => { docFreq[term] = (docFreq[term] || 0) + 1; });
  });

  const total = Math.max(chunks.length, 1);
  const scored = chunks.map((chunk) => {
    const lengthNorm = Object.values(chunk.terms || {}).reduce((a, b) => a + b, 0) || 1;
    let score = 0;
    qTerms.forEach((term) => {
      const tf = (chunk.terms || {})[term] || 0;
      if (!tf) return;
      const idf = Math.log(1 + total / (1 + (docFreq[term] || 0)));
      score += (tf / lengthNorm) * idf;
    });
    return { ...chunk, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);

  return scored.map((chunk) => ({
    ...chunk,
    doc: docs.find((d) => d.id === chunk.docId) || null,
  }));
}
