import fs from 'node:fs';

const filePath = process.argv[2] || 'data/rules/main.rules.json';
const raw = fs.readFileSync(filePath, 'utf8');
const rules = JSON.parse(raw);

const errors = [];

function assert(cond, message) {
  if (!cond) errors.push(message);
}

assert(typeof rules.version === 'string' && rules.version.length > 0, 'version manquante');
assert(typeof rules.source === 'string' && rules.source.includes('main.js'), 'source invalide');
assert(Number.isInteger(rules?.constraints?.maxBinCells) && rules.constraints.maxBinCells > 0, 'constraints.maxBinCells invalide');
assert(typeof rules?.constraints?.defaultTool === 'string', 'constraints.defaultTool invalide');

const expected = ['P1','P2','P3','P4','P5','P6','P7'];
const caps = rules.paletteCapacity || {};
assert(expected.every((k) => k in caps), 'paletteCapacity doit contenir P1..P7');
let previousMax = 0;
for (const key of expected) {
  const entry = caps[key];
  assert(Number.isInteger(entry?.min) && Number.isInteger(entry?.max), `${key}: min/max doivent être des entiers`);
  if (entry && Number.isInteger(entry.min) && Number.isInteger(entry.max)) {
    assert(entry.min <= entry.max, `${key}: min doit être <= max`);
    assert(entry.min === previousMax + 1, `${key}: min doit être continu (attendu ${previousMax + 1})`);
    previousMax = entry.max;
  }
}

const map = rules.locationTypeMap || {};
const locationKeys = Object.keys(map);
assert(locationKeys.length > 0, 'locationTypeMap vide');

const allowedTypes = new Set([...expected, 'MAGASIN', 'RACKING', 'Temporaire 1', 'Temporaire 2', 'Temporaire 3', '6 X P1']);
for (const [loc, type] of Object.entries(map)) {
  assert(/^L\d[A-Z].+/.test(loc), `location invalide: ${loc}`);
  assert(allowedTypes.has(type), `type non reconnu pour ${loc}: ${type}`);
}

assert(rules?.platformConstraints?.offline === true, 'platformConstraints.offline doit être true');
assert(rules?.platformConstraints?.target === 'iPhone', 'platformConstraints.target doit être iPhone');

if (errors.length > 0) {
  console.error('Validation rules: KO');
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
}

console.log(`Validation rules: OK (${filePath})`);
console.log(`Locations: ${locationKeys.length}`);
