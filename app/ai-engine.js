import { putRecord, getAll } from './storage.js';
import { embedText, searchSimilar, storeVector } from './vector-engine.js';
import { detectAnomalies } from './anomaly-engine.js';
import { predictRisk } from './prediction-engine.js';
import { simulateScenario } from './simulator.js';
import { runNeuralLite } from './neural-lite.js';

const intents = {
  consolidation: ['consolider', 'fragmentation', 'volume', 'rentabilite'],
  reception: ['reception', 'arrivage', 'dock'],
  inventaire: ['inventaire', 'stock', 'comptage'],
  optimisation: ['optimise', 'parcours', 'distance', 'zone'],
};

export function normalize(text = '') {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(text = '') {
  return normalize(text).split(' ').filter(Boolean);
}

export function classifyIntent(text = '') {
  const tokens = tokenize(text);
  let best = { intent: 'general', score: 0 };
  Object.entries(intents).forEach(([intent, keywords]) => {
    const score = keywords.reduce((s, key) => s + (tokens.includes(key) ? 1 : 0), 0);
    if (score > best.score) best = { intent, score };
  });
  return best;
}

export function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const separator = detectSeparator(lines[0]);
  const headers = splitRow(lines[0], separator).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitRow(line, separator);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || '').trim(); });
    return row;
  });
}

function detectSeparator(headerLine = '') {
  const candidates = [',', ';', '\t'];
  const scored = candidates.map((sep) => ({ sep, count: headerLine.split(sep).length }));
  return scored.sort((a, b) => b.count - a.count)[0].sep;
}

function splitRow(line = '', separator = ',') {
  if (separator !== ',') return line.split(separator);
  return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((chunk) => chunk.replace(/^"|"$/g, ''));
}

export function splitRowsByColumns(rows = []) {
  const byColumn = {};
  rows.forEach((row, rowIndex) => {
    Object.entries(row).forEach(([columnName, value]) => {
      if (!byColumn[columnName]) byColumn[columnName] = [];
      byColumn[columnName].push({ row: rowIndex + 1, value });
    });
  });
  return byColumn;
}

export async function analyzePrompt(prompt, context = {}) {
  const normalized = normalize(prompt);
  const intent = classifyIntent(normalized);
  const embedding = embedText(normalized);
  await storeVector(normalized, { type: 'prompt' });
  const similar = await searchSimilar(normalized, 3);
  const anomalies = detectAnomalies(context.lines || []);
  const risk = predictRisk(context.history || []);
  const sim = simulateScenario(context.moves || []);
  const neural = runNeuralLite([intent.score / 4, risk.ruptureRisk, risk.moveNeed, anomalies.length / 10]);
  const score = Number((0.3 * intent.score + 0.2 * (1 - risk.ruptureRisk) + 0.2 * (1 - risk.moveNeed) + 0.3 * neural).toFixed(2));

  const reasoning = [
    `Intent principal: ${intent.intent} (score ${intent.score})`,
    `Vecteurs similaires: ${similar.map((s) => `${s.text.slice(0, 24)}(${s.score.toFixed(2)})`).join(', ') || 'aucun'}`,
    `Anomalies détectées: ${anomalies.length}`,
    `Risque rupture: ${(risk.ruptureRisk * 100).toFixed(0)}%`,
    `Gain simulation: ${sim.gain.toFixed(1)}m`,
  ].join('\n');

  const decision = {
    prompt,
    intent: intent.intent,
    score,
    reasoning,
    embedding,
    createdAt: Date.now(),
  };

  await putRecord('decisions', decision);
  return decision;
}

export async function getPerformanceSnapshot() {
  const decisions = await getAll('decisions');
  const total = decisions.length;
  const success = decisions.filter((d) => d.feedback !== false).length;
  return {
    total,
    successRate: total ? Math.round((success / total) * 100) : 0,
    averageScore: total ? (decisions.reduce((s, d) => s + (d.score || 0), 0) / total).toFixed(2) : '0.00',
  };
}
