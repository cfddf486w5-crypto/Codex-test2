import { putEntity, getAllEntities } from './ai_store.js';
import { csvToRows, normalizeDatasetRows } from './ai_import.js';

export function parseDatasetFromText(text) { return normalizeDatasetRows(csvToRows(text)); }

function sumByItem(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const item = String(r.item).trim();
    if (!map.has(item)) map.set(item, { qty: 0, bins: [] });
    const curr = map.get(item);
    curr.qty += Number(r.qty || 0);
    curr.bins.push({ bin: r.bin || 'N/A', qty: Number(r.qty || 0) });
  });
  return map;
}

export function aggregateInventory(inventoryRows = [], receptionRows = []) {
  const inv = sumByItem(inventoryRows);
  const rec = sumByItem(receptionRows);
  const items = new Set([...inv.keys(), ...rec.keys()]);
  const out = [];
  items.forEach((item) => {
    const i = inv.get(item) || { qty: 0, bins: [] };
    const r = rec.get(item) || { qty: 0, bins: [] };
    const total = i.qty + r.qty;
    if (total === 0) return;
    if (i.qty === 0 && r.qty === 0) return;
    out.push({
      item,
      invQty: i.qty,
      recQty: r.qty,
      total,
      invBins: i.bins,
      recBins: r.bins,
      bins: [...i.bins, ...r.bins],
      recommandation: total < 20 ? 'Priorité réappro' : 'Stock OK',
    });
  });
  return out.sort((a, b) => a.total - b.total);
}

export function itemsUnderThreshold(rows, threshold = 20) {
  return rows.filter((r) => r.total < threshold);
}

export function generateMovesReport(rows) {
  return rows.map((r) => ({
    item: r.item,
    total: r.total,
    bins: r.bins.map((b) => `${b.bin}(${b.qty})`).join(' | '),
    recommendation: r.recommandation,
  }));
}

export function toCsv(rows = []) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(';'), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(';'))].join('\n');
}

export function exportHtmlPrint(rows, title = 'Rapport WMS') {
  const table = `<table border="1"><tr>${Object.keys(rows[0] || {}).map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${Object.values(r).map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${table}</body></html>`;
}

export async function saveDataset(kind, fileName, text) {
  return putEntity('datasets', { kind, name: fileName, text });
}

export async function loadMergedDataset() {
  const datasets = await getAllEntities('datasets');
  const inv = datasets.find((x) => x.kind === 'inventory');
  const rec = datasets.find((x) => x.kind === 'reception');
  if (!inv || !rec) throw new Error('Inventaire + réception requis');
  return aggregateInventory(parseDatasetFromText(inv.text), parseDatasetFromText(rec.text));
}
