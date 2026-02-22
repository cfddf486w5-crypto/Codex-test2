function parseCsvRows(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
    return obj;
  });
}

export function aggregateInventory(inventoryRows = [], receptionRows = []) {
  const merged = [...inventoryRows, ...receptionRows];
  const byItem = new Map();
  merged.forEach((row) => {
    const item = row.item || row.Item || row.sku;
    const bin = row.bin || row.Bin || 'N/A';
    const qty = Number(row.qty || row.Qty || row.quantity || 0);
    if (!item || Number.isNaN(qty)) return;

    if (!byItem.has(item)) byItem.set(item, { item, total: 0, bins: [] });
    const target = byItem.get(item);
    target.total += qty;
    target.bins.push({ bin, qty });
  });

  return Array.from(byItem.values()).filter((x) => x.total !== 0).map((row) => ({
    ...row,
    recommandation: row.total < 20 ? 'Déplacement prioritaire' : 'Surveiller',
  }));
}

export function itemsUnder20(rows) {
  return rows.filter((r) => r.total < 20);
}

export function toCsv(rows) {
  const header = 'item,total,recommandation,bins';
  const lines = rows.map((r) => `${r.item},${r.total},${r.recommandation},"${r.bins.map((b) => `${b.bin}:${b.qty}`).join(' | ')}"`);
  return [header, ...lines].join('\n');
}

export function exportMovementPdf(rows) {
  const content = rows.map((r) => `${r.item} - total ${r.total} - ${r.recommandation}`).join('\n');
  const blob = new Blob([`DL WMS - Liste déplacements\n\n${content}`], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export function parseDatasetFromText(text) {
  return parseCsvRows(text);
}
