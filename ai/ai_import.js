import { putEntity } from './ai_store.js';

function decodeAuto(arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(u8);
  if (utf8.includes('�')) return new TextDecoder('iso-8859-1').decode(u8);
  return utf8;
}

export function csvToRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(';').length >= lines[0].split(',').length ? lines[0].split(';') : lines[0].split(',');
  return lines.slice(1).map((line) => {
    const sep = line.split(';').length >= line.split(',').length ? ';' : ',';
    const values = line.split(sep);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  });
}

export function normalizeDatasetRows(rows) {
  return rows.map((r) => ({
    item: r.item || r.Item || r.sku || r.SKU || r.article,
    qty: Number(r.qty || r.Qty || r.quantite || r.quantity || 0),
    bin: r.bin || r.location || r.loc || r.emplacement || 'N/A',
  })).filter((x) => x.item);
}

export async function importFiles(files = [], onProgress = () => {}, shouldCancel = () => false) {
  const out = [];
  for (let i = 0; i < files.length; i += 1) {
    if (shouldCancel()) break;
    const file = files[i];
    const text = decodeAuto(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase();
    const kind = ext === 'csv' ? 'csv' : 'text';
    const entity = await putEntity('docs', { name: file.name, kind, text, size: file.size });
    out.push({ ok: true, id: entity.id, name: file.name });
    onProgress({ current: i + 1, total: files.length, name: file.name });
  }
  return out;
}
