import { putRecord, getAll } from './storage.js';

export function embedText(text = '') {
  const vec = new Array(16).fill(0);
  const clean = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  for (let i = 0; i < clean.length; i += 1) vec[i % vec.length] += clean.charCodeAt(i) / 255;
  const norm = Math.hypot(...vec) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a = [], b = []) {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i += 1) dot += a[i] * b[i];
  return dot;
}

export async function storeVector(text, meta = {}) {
  const vector = embedText(text);
  await putRecord('vectors', { text, vector, meta });
  return vector;
}

export async function searchSimilar(query, limit = 5) {
  const q = embedText(query);
  const items = await getAll('vectors');
  return items
    .map((item) => ({ ...item, score: cosineSimilarity(q, item.vector || []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
