export function structuredAnswer({ summary, details = [], table = [] }) {
  let out = `Résumé: ${summary}\n\n`;
  if (details.length) out += `Détails:\n${details.map((d) => `- ${d}`).join('\n')}\n\n`;
  if (table.length) {
    out += 'Tableau:\n';
    const headers = Object.keys(table[0] || {});
    out += `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`;
    table.forEach((row) => { out += `| ${headers.map((h) => row[h] ?? '').join(' | ')} |\n`; });
  }
  return out.trim();
}
