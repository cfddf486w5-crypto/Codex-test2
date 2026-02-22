import { putEntity } from './ai_store.js';
import { indexDocument } from './ai_rag.js';

function decodeCsv(buffer) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const replacementCount = (utf8.match(/�/g) || []).length;
  if (replacementCount > 0) return new TextDecoder('iso-8859-1').decode(buffer);
  return utf8;
}

export async function importFiles(files) {
  const results = [];
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const buffer = await file.arrayBuffer();
    let text = '';

    if (['txt', 'md', 'csv'].includes(ext)) {
      text = ext === 'csv' ? decodeCsv(buffer) : new TextDecoder('utf-8').decode(buffer);
    } else if (ext === 'xlsx') {
      if (window.XLSX) {
        const wb = window.XLSX.read(buffer, { type: 'array' });
        text = wb.SheetNames.map((n) => window.XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n');
      } else {
        results.push({ name: file.name, ok: false, reason: 'XLSX non supporté hors SheetJS locale.' });
        continue;
      }
    } else if (ext === 'pdf') {
      results.push({ name: file.name, ok: false, reason: 'PDF: importer le texte extrait (txt/md).' });
      continue;
    } else {
      results.push({ name: file.name, ok: false, reason: 'Format non supporté' });
      continue;
    }

    const doc = await putEntity('docs', { name: file.name, ext, text, size: file.size });
    const chunkCount = await indexDocument(doc);
    results.push({ name: file.name, ok: true, chunks: chunkCount });
  }
  return results;
}
