import { aggregateInventory, itemsUnderThreshold } from './ai_tools.js';
import { parseIntent } from './ai_intents.js';

export const SCENARIOS = [
  { q: 'donne les items < 20', expectedIntent: 'list_items_under_threshold' },
  { q: 'générer rapport deplacement', expectedIntent: 'generate_moves_report' },
  { q: 'export csv', expectedIntent: 'export_csv' },
];

export function runUnitTests() {
  const inv = [{ item: 'A', qty: 10, bin: 'B1' }, { item: 'B', qty: 5, bin: 'B2' }];
  const rec = [{ item: 'A', qty: 2, bin: 'R1' }, { item: 'C', qty: 3, bin: 'R2' }];
  const merged = aggregateInventory(inv, rec);
  const low = itemsUnderThreshold(merged, 20);
  return [
    { name: 'merge_count', pass: merged.length === 3, got: merged.length, expected: 3 },
    { name: 'low_threshold', pass: low.length === 3, got: low.length, expected: 3 },
  ];
}

export function runIntentTests() {
  return SCENARIOS.map((s) => {
    const result = parseIntent(s.q);
    return { name: s.q, pass: result.intent === s.expectedIntent, got: result.intent, expected: s.expectedIntent };
  });
}

export function runAllEvaluations() {
  const tests = [...runUnitTests(), ...runIntentTests()];
  const passed = tests.filter((t) => t.pass).length;
  return { passed, total: tests.length, score: `${passed}/${tests.length}`, tests };
}
