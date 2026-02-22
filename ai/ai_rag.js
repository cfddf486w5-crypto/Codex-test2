import { getAllEntities, putEntity, removeEntity } from './ai_store.js';

export function normalizeText(v) {
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function chunkText(doc) {
  const lines = doc.text.split(/\r?\n/);
  const chunks = [];
  let section = 'root';
  let bucket = [];
  lines.forEach((line, idx) => {
    if (/^#{1,3}\s|^[A-Z][^:]{2,}:$/.test(line.trim())) {
      if (bucket.length) chunks.push({ section, text: bucket.join(' '), lineStart: idx - bucket.length + 1 });
      section = line.replace(/^#+\s*/, '').trim();
      bucket = [];
    } else if (line.trim()) {
      bucket.push(line.trim());
      if (bucket.length >= 4) {
        chunks.push({ section, text: bucket.join(' '), lineStart: idx - 3 });
        bucket = [];
      }
    }
  });
  if (bucket.length) chunks.push({ section, text: bucket.join(' '), lineStart: Math.max(1, lines.length - bucket.length) });
  return chunks;
}

function tokens(text) {
  return normalizeText(text).split(' ').filter(Boolean);
}

function scoreChunk(query, chunk) {
  const q = tokens(query);
  const c = tokens(chunk.text);
  const setC = new Set(c);
  const overlap = q.filter((x) => setC.has(x)).length;
  const tri = q.join(' ').includes(c.slice(0, 3).join(' ')) ? 1 : 0;
  const tfidfApprox = overlap / Math.max(1, Math.sqrt(c.length));
  return tfidfApprox + tri + (chunk.priorityBonus || 0);
}

export async function reindexDocuments({ onProgress = () => {}, shouldCancel = () => false } = {}) {
  const docs = await getAllEntities('docs');
  const oldChunks = await getAllEntities('chunks');
  await Promise.all(oldChunks.map((c) => removeEntity('chunks', c.id)));
  let count = 0;
  for (let i = 0; i < docs.length; i += 1) {
    if (shouldCancel()) break;
    const doc = docs[i];
    const docChunks = chunkText(doc);
    for (const [idx, c] of docChunks.entries()) {
      await putEntity('chunks', {
        docId: doc.id,
        source: doc.name,
        section: c.section,
        lineStart: c.lineStart,
        chunkId: `${doc.id}:${idx}`,
        text: c.text,
      });
      count += 1;
    }
    onProgress({ current: i + 1, total: docs.length, chunks: count });
  }
  return { docs: docs.length, chunks: count };
}

export async function searchChunks(query, topK = 5) {
  const all = await getAllEntities('chunks');
  return all
    .map((c) => ({ ...c, score: scoreChunk(query, c) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
