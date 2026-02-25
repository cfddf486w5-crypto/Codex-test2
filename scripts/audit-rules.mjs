import fs from 'node:fs';

const sourcePath = process.argv[2] || 'data/rules/main.rules.json';
const outPath = process.argv[3] || 'docs/rules-audit-report.md';
const rules = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const map = rules.locationTypeMap || {};
const counts = new Map();
for (const type of Object.values(map)) {
  counts.set(type, (counts.get(type) || 0) + 1);
}

const sorted = [...counts.entries()].sort((a,b) => a[0].localeCompare(b[0], 'fr'));
const lines = [];
lines.push('# Audit des règles métier');
lines.push('');
lines.push(`- Source: \`${sourcePath}\``);
lines.push(`- Version: \`${rules.version}\``);
lines.push(`- Cible: ${rules?.platformConstraints?.target || 'N/A'} (offline=${rules?.platformConstraints?.offline === true ? 'true' : 'false'})`);
lines.push(`- Nombre de locations: ${Object.keys(map).length}`);
lines.push('');
lines.push('## Répartition des types');
lines.push('');
lines.push('| Type | Nombre |');
lines.push('|---|---:|');
for (const [type, total] of sorted) {
  lines.push(`| ${type} | ${total} |`);
}
lines.push('');
lines.push('_Rapport généré automatiquement (sans modification UI)._');

fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Audit écrit: ${outPath}`);
